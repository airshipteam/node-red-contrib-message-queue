/**
 * Copyright 2018-2020 M. I. Bell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modified by Simon Walters 31 Jul 2019 to select toggle behavior: open/closed or open/queueing
 * Modified by Colin Law 06 Apr 2020 to implement peek, drop, and status commands
 * Modified by Andre Guerra 09 Sep 2021 to implement interval feature, plus removing a few features
 **/

module.exports = function (RED) {

    function MessageQueueNode(config) {
        RED.nodes.createNode(this, config);
        const openStatus = { fill: 'green', shape: 'dot', text: 'open' };
        const closedStatus = { fill: 'red', shape: 'ring', text: 'closed' };
        var queueStatus = { fill: 'yellow' };
        
        // Copy configuration items
        this.controlTopic = config.controlTopic.toLowerCase();
        this.openCmd = config.openCmd.toLowerCase();
        this.closeCmd = config.closeCmd.toLowerCase();
        this.queueCmd = config.queueCmd.toLowerCase();
        this.triggerCmd = config.triggerCmd.toLowerCase();
        this.flushCmd = config.flushCmd.toLowerCase();
        this.resetCmd = config.resetCmd.toLowerCase();
        this.statusCmd = (config.statusCmd || "status").toLowerCase();
        this.defaultCmd = config.defaultCmd.toLowerCase();
        this.defaultState = config.defaultState.toLowerCase();
        this.storeName = config.storeName;

        // Save "this" object
        var node = this;
        var context = node.context();
        var storeName = node.storeName;
        var state = context.get('state-context', storeName);
        var queue = context.get('queue-context', storeName);

        //set interval
        this.interval = config.interval && config.interval > 0 ? parseInt(config.interval) : 0;
        var interval = node.interval && node.interval > 0 ? parseInt(node.interval) : 0;

        state = node.defaultState;
        queue = [];
        
        context.set('state-context', state, storeName);
        context.set('queue-context', queue, storeName);

        // Initialize status display
        switch (state) {
            case 'open':
                node.status(openStatus);
                break;
            case 'closed':
                node.status(closedStatus);
                break;
            case 'queueing':
                queueStatus.text = 'queuing: ' + queue.length;
                queueStatus.shape = 'ring';
                node.status(queueStatus);
                break;
            default:
                node.error('Invalid state');
        }


        function Timer(fn, t) {
            var timerObj = setInterval(fn, t);

            this.stop = function () {
                if (timerObj) {
                    clearInterval(timerObj);
                    timerObj = null;
                }
                return this;
            }

            // start timer using current settings (if it's not already running)
            this.start = function () {
                if (!timerObj) {
                    this.stop();
                    timerObj = setInterval(fn, t);
                }
                return this;
            }

            // start with new or original interval, stop current interval
            this.reset = function (newT = t) {
                t = newT;
                return this.stop().start();
            }
        }


        if (interval && interval > 0 && state === 'queueing') {

            var timer = new Timer(function () {
                if (queue.length > 0 ) {
                    node.send(queue.shift());
                    queueStatus.text = 'queuing: ' + queue.length;
                    queueStatus.shape = 'ring';
                    node.status(queueStatus);

                    context.set('state-context', state, storeName);
                    context.set('queue-context', queue, storeName);
                }
            }, interval);
            
            context.set('timer-context', timer, storeName);
        }


        node.on('close', function () {
            var timer = context.get('timer-context', storeName);
            timer.stop();
        });

        // Process inputs
        node.on('input', function (msg) {

            var state = context.get('state-context', storeName) || node.defaultState;
            var queue = context.get('queue-context', storeName) || [];

            if (typeof msg.topic === 'string' &&
                msg.topic.toLowerCase() === node.controlTopic) {
                // Change state
                if (typeof msg.payload === 'undefined' || msg.payload === null) {
                    msg.payload = '';
                }
                switch (msg.payload.toString().toLowerCase()) {
                    case node.openCmd:
                        // flush then open
                        node.send([queue]);
                        queue = [];
                        state = 'open';
                        break;
                    case node.closeCmd:
                        // reset then close
                        queue = [];
                        state = 'closed';
                        break;
                    case node.queueCmd:
                        state = 'queueing';
                        break;
                    case node.triggerCmd:
                        if (state === 'queueing') {
                            // Dequeue
                            var timer = context.get('timer-context', storeName);
                            if (timer && this.interval && this.interval > 0) {
                                timer.reset();
                            }
                            node.send(queue.shift());
                        }
                        break;
                    case node.statusCmd:
                        // just show status, so do nothing here
                        break;
                    case node.flushCmd:
                        node.send([queue]);
                    case node.resetCmd:
                        queue = [];
                        break;
                    case node.defaultCmd:
                        // reset then default
                        queue = [];
                        state = node.defaultState;
                        break;
                    default:
                        node.warn('Invalid command ignored');
                        break;
                } 
    
                // Save state
                context.set('state-context', state, storeName);
                context.set('queue-context', queue, storeName);

                // Show status
                switch (state) {
                    case 'open':
                        node.status(openStatus);
                        break;
                    case 'closed':
                        node.status(closedStatus);
                        break;
                    case 'queueing':
                        queueStatus.text = 'queuing: ' + queue.length;
                        queueStatus.shape = 'ring';
                        node.status(queueStatus);
                }
                node.send(null);
                
            } else {
                // Process message
                switch (state) {
                    case 'open':
                        node.send(msg);
                        break;
                    case 'closed':
                        node.send(null);
                        break;
                    case 'queueing':
                        // Enqueue
                        queue.push(msg);
                        queueStatus.text = 'queuing: ' + queue.length;
                        queueStatus.shape = 'ring';
                        node.status(queueStatus);
                        break;
                    default:
                        node.error('Invalid state');
                }
            }
            
        })
    }
    RED.nodes.registerType("message-queue", MessageQueueNode);
}
