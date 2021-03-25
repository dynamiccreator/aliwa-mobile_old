# aliwa
A light wallet for the ALIAS cryptocurrency

## Download binaries
LINUX: https://github.com/dynamiccreator/aliwa/releases/download/0.0.2/aliwa_0.0.2_amd64.deb

## Build from source (electron.js --> https://www.electronjs.org/)

### Requirements

* Node.js >=12.0.0

### Steps

1. `npm init -y`
2. `npm i --save-dev electron`
3. `npm i -g @electron-forge/cli` (install electron-forge)
4. `electron-forge import`
5. (optional for logo) copy the inside of `"config": {}` from  "confg package" file into "package.json" into 
   the "config" object of an electron maker ("@electron-forge/maker-deb" for the .deb package)
6. `npm run make`
