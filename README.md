# aliwa
A light wallet for the ALIAS cryptocurrency

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
7. `npm run make`
