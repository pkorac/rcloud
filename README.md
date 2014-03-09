# RCLOUD
## A simple node.js command line tool for dealing with Rackspace's cloud files


Documentation is not finished yet, please have patience (•


### Requirements
Node.js, NPM, Git

### Installation
Clone the repository
```git clone git@github.com:pkorac/rcloud.git```

Run ```npm install```

Rename the ```creds-template.json``` to ```creds.json``` and edit your rackspace credentials.


### Usage

**Containers**

List containers:
```./rcloud.js -l```

Create a container:
```./rcloud.js -c container_name```
*this currently creates a CDN disabled container with a very long TTL (you can edit this in your rackspace panel)

Empty container:
```./rcloud.js -e container_name```

Destroy container:
```./rcloud.js -d container_name```


**Files**

List files in container
```./rcloud.js -f container_name```

Remove files from container
```./rcloud.js -r file_name -t container_name```

Upload file or folder
```./rcloud.js -u folder_or_file_name -t container_name```


Have fun
