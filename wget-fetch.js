'use strict';

const fs = require('fs'),
	fetch = require('node-fetch');

/**
 * Retrieval of remote files over http or https by way of `node-fetch`
 *
 * @param String url Absolute url of source
 * @param Mixed action Save to destination or Body action on Response
 * @param Object options Fetch/Request options
 *
 * @return Promise
 */
function wget(url, action = '', options = {}) {
	var src = url,
		destination = action || './',
		parts = src.split('/'),
		file = parts[parts.length - 1];
	parts = file.split('?');
	file = parts[0];
	parts = file.split('#');
	file = parts[0];

	if (typeof action === 'string' && ['array', 'buffer', 'blob', 'json', 'text', 'converted', 'stream'].includes(action)) {
		destination = './';
	} else if (typeof action === 'object') {
		options = action;
		destination = './';
		action = 'stream';
		if (options.action) {
			action = options.action;
			delete options.action;
		}
	} else {
		action = 'download';
	}

	if (destination.substr(destination.length - 1, 1) == '/') {
		destination = destination + file;
	}

	if (options.dry) {
		return new Promise((resolve) => {
			resolve({
				filepath: destination
			});
		});
	} else {
		return fetch(src, options)
			.then(res => {
				switch (action) {
					case 'array':
						return res.arrayBuffer();
					case 'buffer':
						return res.buffer();
					case 'blob':
						return res.blob();
					case 'json':
						return res.json();
					case 'text':
						return res.text();
					case 'converted':
						return res.textConverted();
					case 'stream':
						return new Promise((resolve) => resolve(res.body));
					default:
						return new Promise((resolve, reject) => {
							const fileSize = Number.isInteger(res.headers.get('content-length') - 0) ?
								parseInt(res.headers['content-length']) :
								0;
							var downloadedSize = 0;
							const writer = fs.createWriteStream(destination, {
								flags: 'w+',
								encoding: 'binary'
							});
							res.body.pipe(writer);

							res.body.on('data', function (chunk) {
								downloadedSize += chunk.length;
							});

							writer.on('finish', () => {
								writer.end();
								var info = {
									filepath: destination,
									fileSize: downloadedSize,
									retrievedSizeMatch: (fileSize === downloadedSize)
								};

								info.headers = res.headers.raw();
								return resolve(info);
							});
							writer.on('error', reject);
						});
				}
			})
			.catch(err => console.log(err));
	}
}

module.exports = exports = wget;