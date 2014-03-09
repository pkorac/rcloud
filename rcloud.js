#!/usr/bin/env node

/*
	USAGE
	
	////////////////
	// Containers

	Create a container
	-c [container]

	List containers	
	-l
	
	Empty container
	-e [container]
	
	Destroy container
	-d [container]
	


	////////////////
	// Files

	List files	
	-f [container]
	
	Remove files
	./rcloud.js -r [file] -t [container]
	
	Uload files
	-u [folder/file] -t [container]
		
*/


var util = require('util'),
	fs = require('fs'),
	pkgcloud = require('pkgcloud'),
	readline = require('readline'),
	path = require('path');

// args
var argv = require('minimist')(process.argv.slice(2));

/*
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
*/




var creds = JSON.parse( fs.readFileSync( '_rcloud_creds.json', { encoding: 'utf8' } ).toString() );


// CLIENT
var client = pkgcloud.storage.createClient({
	provider: 'rackspace',
	username: creds.username,
	apiKey: creds.apiKey,
	region: creds.region
});


// ACTIONS

//console.log( util.inspect( argv, { depth: 10, colors: true } ) );

if ( argv['c'] && argv['c'].length > 0 ){	
	
	var container = argv['c'];
	
	client.createContainer( { name: container, cdnEnabled: true, ttl: 900 }, function(err, result){
		if( err ) throw err;
		
		console.log( container, 'created.\nPlease note that it is not CDN enabled and has a long TTL' );
		
	} );
	
}




// EMPTY CONTAINER
if ( argv['e'] && argv['e'].length > 0 ){
	var container = argv['e'];
	
	console.log('This will REMOVE all the files, are you sure?');
	
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	rl.question("Type YES to confirm: ", function(answer){
		if ( answer === 'yes' || answer === 'YES' ){
		
			console.log('Emptying container, this can take some time');
			
			client.getFiles( container, {limit: 'Infinity'}, function( err, files ){
	
				if ( err ) throw err;
				
				if ( files.length > 0 ){
					var counter = 0;
					var fileRemoval = function fileRemoval(){
			
						client.removeFile( container, files[counter], function(err, results){
							if (err ) throw err;
							
							console.log( "Removed", files[counter].name );
							
							if ( counter < files.length-1 ){
								counter++;
								fileRemoval();
							}				
						} );					
					}();
					
				} else {
					console.log("The container is already empty");
				}
			} );
			
			
		} else {
			console.log('Action aborted');
		}
		rl.close();
	});
}



// DESTROY CONTAINER
if ( argv['d'] && argv['d'].length > 0 ){
	
	var container = argv['d'];
	console.log('This will DESTROY the', container, 'container. Are you sure?' );
	
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	rl.question("Type YES to confirm: ", function(answer){
		
		if ( answer === 'yes' || answer === 'YES' ){

			console.log('Destroying container, this can take some time');
						
			client.destroyContainer( container, function(err, results){
				if ( err ) throw err;
				
				console.log( container, "destroyed." );
				
			});
			
		} else {
			console.log('Action aborted');
		}
		rl.close();
	});
}





// LIST CONTAINERS
if ( argv['l'] ){

	client.getContainers( function(err, containers){
		
		if ( err ) throw err;
				
		for( var i = 0; i < containers.length; i++ ){
			console.log( containers[i].name );
		}		
	} );
}






// LIST FILES
if ( argv['f'] && argv['f'].length > 0 ){
	var container = argv['f'];
	console.log("listing files in", container );
	
	client.getFiles( container, {limit: 'Infinity'}, function( err, files ){
		if ( err ) throw err;
		
		for ( var i = 0; i < files.length; i++ ){
			console.log( files[i].name );
		}
		
	});
}





// UPLOAD FILES
if ( argv['u'] && argv['u'].length > 0 && argv['t'] && argv['t'].length > 0 ){

	var container = argv['t'];
	var firstFile = argv['u'];


	// local path slicing
	var lengthToslice = 0;
	if ( fs.statSync( firstFile ).isDirectory() ){
		if ( firstFile[ firstFile.length-1 ] === '/' ) firstFile = firstFile.substring(0, firstFile.length-1);		
		lengthToslice = firstFile.length+1;		
	} else {
		var parts = firstFile.split( path.sep );		
		console.log( parts );
		
		parts.pop();		
		
		lengthToslice = parts.join('/').length;
		if ( parts.length > 0 ) lengthToslice = parts.join('/').length + 1;		
	}
	
	
	// remote prefix
	if ( container[container.length-1] === '/' ){
		container = container.substring(0, container.length-1);
	}
	//console.log( container );
	//console.log( container.split( '/' ) );

	var remotePrefix = container.split( '/' );
	remotePrefix = remotePrefix.splice( 1, remotePrefix.length );
	remotePrefix = remotePrefix.join('/');
	if ( remotePrefix.length > 0 ) remotePrefix += '/';

	
	
	// recurse through folders
	var fileList = [];
	
	var recursor = function recursor( file ){
		
		if ( path.basename( file) !== 'node_modules' && path.basename( file) !== '_rcloud_creds.json' ){
		
			if ( fs.statSync( file ).isDirectory() ){
				
				var files = fs.readdirSync( file );
				for( var i = 0; i < files.length; i++ ){
					recursor( file + '/' + files[i] );
				}
							
			} else {
				
				var remote = remotePrefix + file.slice( lengthToslice, file.length );
				
				fileList.push( { local: file, remote: remote } );
				
				//console.log( 'l', file );
				//console.log( 'r', remote );
				
			}
		}
	};	
	recursor( firstFile );
	
		
	//console.log( util.inspect( fileList, { depth: 10, colors: true } ) );			
	
	
	
	var i = 0;
	var uploader = function uploader( err, results ){
		if ( err ) throw err;
					
		if( i< fileList.length ) {
		
			var file = fileList[i];
			console.log( file.remote );

			i++;
			client.upload( {
				container: container,
				remote: file.remote,
				local: file.local
			}, uploader );
		}
	}();
	
	
	
}




// REMOVE FILES
if ( argv['r'] && argv['r'].length > 0 && argv['t'] && argv['t'].length > 0 ){

	var file = argv['r'];
	var container = argv['t'];
	
	//console.log( "removing file", file, "in", container );
	client.removeFile( container, file, function( err, data ){
		if (err) throw err;
		console.log( 'Removed', file, 'from', container );
	});
	
}













// Have fun