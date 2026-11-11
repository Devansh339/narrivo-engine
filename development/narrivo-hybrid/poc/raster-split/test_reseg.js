const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
console.log('Testing updated segmentation logic in test_reseg.js');
