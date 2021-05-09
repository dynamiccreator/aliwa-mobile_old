# aliwa
A light wallet for the ALIAS cryptocurrency

## Intermediate commit report 9.May 2021
-Mobile
	-refractoring code for browserify compatibility (node modules can't be used for cordova)
		-> almost mobile ready (only I/O functions and tor migration missing) 
-Bug fixes:
	-show note while unconfirmed
	-fix: sometimes wrong balance on restore from seed 
	-fix max. amount button function
	-improve syncing "wait for server" problem when server is syncing itself (still not perfect)
	-fix qr codes in addressbook
-Transactions:
	-Add all details 
	-Search/Order by
	-show labels instead of addresses
	- edit labels within details
	-better mobile / narrower screen overview 
-Address Book:
	-Contacts/Receive:
		-Pagination
		-Order by / Search
		-new address/ new contact
		-Edit Label
		-Delete contact
-Send
	-Auto paste labels from Addressbook on destination address changes
	-Add new contacts to addressbook on sending
-Multi Send
	-partly implemented ( only overview,edit and delete missing)
-Receive Payment (like Receive but with Note and Amount + (included in qr code like in in core wallet)


## WARNING: Experimental ALPHA Software
**Please put no funds on this wallet, you're not willing to lose.
Also don't restore from seeds which contains funds you're not willing to lose.**

## Download binaries
WINDOWS : https://github.com/dynamiccreator/aliwa/releases/download/0.0.2/ALiWa_alpha_0.0.2_WINDOWS.zip

LINUX DEB (Debianubuntu,...) https://github.com/dynamiccreator/aliwa/releases/download/0.0.2/aliwa_0.0.2_amd64.deb

Linux RPM (fedora,suse,...) : https://github.com/dynamiccreator/aliwa/releases/download/0.0.2/ALiWa-0.0.2-1.x86_64.rpm

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
