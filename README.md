# node-red-contrib-message-queue

Node-RED nodes for messages queueing

### Install

From your Node-RED directory:

`npm install node-red-contrib-message-queue`
    
### Usage

Open the editor panel. Select your nodes.

This is a work based on `queue-gate` [node-red-contrib-queue-gate](https://github.com/drmibell/node-red-contrib-queue-gate), with added ability to set an interval, so if the queue is on "queeing" mode it will trigger the next message every X miliseconds, also removed a few capabilities such as peek and drop.

