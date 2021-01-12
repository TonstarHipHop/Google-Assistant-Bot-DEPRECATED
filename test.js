var sox = require('sox-stream')
var fs  = require('fs')

fs.createReadStream('./Sounds/breathe.wav')
	.pipe( sox({ output: { type: 'flac' } }) )
  .pipe( fs.createWriteStream('song.flac') )