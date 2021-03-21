# aliwa
A light wallet for the ALIAS cryptocurrency

## Alpha notice
While in alpha version: For updates build from source or do the Manual Update below.

## Manual Update
1. Install a build from https://github.com/dynamiccreator/aliwa/releases/tag/0.0.1
2. (Linux) Replace everything but the folders  "fomantic" and "node_modules" in location "/lib/aliwa/resources/app" with the content of the current commit.
(Hint: Just find a folder which looks like this repository)
3.(Windows) The same as in linux (Location is "resources\app" from the unzipped folder) 


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
