#### 1.1.2: Timer consistency (08-10-2021)
- Fixed a bug where the timer would not be cleared by the browser, creating two instances of it
- Removed the persistent option

#### 1.1.0: Compatibility

Removed `send` and `done` from `node.on('input', function (msg)`. 
Seems this was causing some issues on older versions of Node-RED
