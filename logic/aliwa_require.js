loki = require("lokijs");
//fs = require('fs'); // will be replaced with cordova plugin
aes256 = require("aes256");

//crypto = require('crypto');
//argon2 = require('argon2'); // replaced from https://github.com/antelle/argon2-browser

numeral = require('numeral');

io = require('socket.io-client');

bip39 = require("bip39");
hdkey = require("hdkey");
createHash = require("create-hash");
bs58check = require("bs58check");
bs58_2 = require("bs58");

EC = require("elliptic").ec;

browser_Buffer = require('buffer');

SocksProxyAgent = require('socks-proxy-agent');
