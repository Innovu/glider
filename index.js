var is4Plus;
try {
	is4Plus = parseInt(process.version.split('.')[0].replace('v', ''), 10) >= 4;
} catch (e) {
	is4Plus = false;
}

module.exports = is4Plus ? require('./src') : require('./lib');
