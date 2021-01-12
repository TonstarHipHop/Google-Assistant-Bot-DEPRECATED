const { Client, RichEmbed, Collection } = require("discord.js");
const { config } = require("dotenv");
const { Transform, Readable } = require('stream');
const speech = require('@google-cloud/speech');
const funcs = require('./functions');
const fs = require('fs');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const wav = require('wav');
const SampleRate = require('node-libsamplerate');
const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();
const util = require('util');

const resampleOptions = {
  // Value can be from 0 to 4 or using enum. 0 is the best quality and the slowest.
  type: 2,
  // Stereo
  channels: 1,
  // Sample rate of source
  fromRate: 48000,
  // bit depth of source. Valid values: 16 or 32
  fromDepth: 16,
  // Desired sample rate
  toRate: 16000,
  // Desired bit depth. Valid values: 16 or 32
  toDepth: 16
}


const models = new Models();

models.add({
  file: './hotwords/alexa.umdl',
  sensitivity: '0.50',
  hotwords : 'alexa'
});

const detectorOptions = {
  resource: "./hotwords/common.res",
  models: models,
  audioGain: 1.0,
  applyFrontend: false
}

const speechclient = new speech.SpeechClient();


// Discord client construction
const client = new Client( {
  disableEveryone: true
});

client.commands = new Collection();
client.aliases = new Collection();

require('dotenv').config();
["command"].forEach(handler => {
  require(`./handler/${handler}`)(client);
});

class ConvertTo1ChannelStream extends Transform {
  constructor(source, options) {
    super(options)
  }

  _transform(data, encoding, next) {
    next(null, funcs.convertBufferTo1Channel(data))
  }
}

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.destroy();
  }
}

// Google speech construction
const requestConfig = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
}
const request = {
  config: requestConfig,
  single_utterance: true
}



config({
  path: __dirname + "/.env"
});

client.login(process.env.TOKEN);



client.on("ready", () => {
  console.log("Bot is ready");
  client.user.setPresence({
    status: "online",
    activity: {
      name: "your conversations",
      type: "LISTENING"
    }
  })
});

client.on("message", async message => {
  const prefix = "=";
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;
  if (!message.member) message.member = await message.guild.fetchMember(message);
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const cmd = args.shift();
  if (cmd.length === 0) return;
  let command = client.commands.get(cmd);
  if (!command) command = client.commands.get(client.aliases.get(cmd));

  if (command)
    await command.run(client, message, args);
});

function createStream(connection, member) {
  if (member.user.bot || !connection) {
    return;
  }
  const receiver = connection.receiver;
  let audioStream = receiver.createStream(member.user, { mode: 'pcm', end: "manual"});
  let detector = new Detector(detectorOptions);
  const resample = new SampleRate(resampleOptions);
  const convertTo1ChannelStream = new ConvertTo1ChannelStream();
  let oneChannelStream = audioStream.pipe(convertTo1ChannelStream);

  const hotwordCallback = () => {
    connection.play('./Sounds/ping_start.mp3', { volume: 0.5 });
    const recognizeStream = speechclient
      .streamingRecognize(request)
      .once('data', async(response) => {
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n')
          .toLowerCase();
        console.log("transcription:", transcription);
        if (transcription !== null) {
          let textchannelid = null;
          var BreakException = {};
          try{
            member.guild.channels.cache.each(channel => {
              if (channel.type === 'text') {
                textchannelid = channel.id;
                throw BreakException;
              }
            });
          } catch (e) {
            if (e !== BreakException) throw e;
          }
          textchannel = member.guild.channels.cache.get(textchannelid);
          textchannel.send(`What you said: ${transcription}`);
          const args = transcription.trim().split(/ +/g);
          const cmd = args.shift().toLowerCase();
          let command = client.commands.get(cmd);
          if (!command) command = client.commands.get(client.aliases.get(cmd));
          let answer = null;
          if (command)
            answer = await command.run(client, null, args, member);
          else {
            command = client.commands.get("google");
            args.unshift(cmd);
            answer = await command.run(client, null, args, member);
          }
          if (answer) {
            textchannel.send(`Assistant response: ${answer}`);
            const ttsRequest = {
              input: {text: answer},
              // Select the language and SSML voice gender (optional)
              voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
              // select the type of audio encoding
              audioConfig: {audioEncoding: 'MP3'},
            };
            const [response] = await ttsClient.synthesizeSpeech(ttsRequest);
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(`./Sounds/${connection.voice.channelID}/${member.id}.mp3`, response.audioContent, 'binary');
            await connection.play(`./Sounds/${connection.voice.channelID}/${member.id}.mp3`);
          }
        }
        return;
      });
    const googleResample = oneChannelStream.pipe(new SampleRate(resampleOptions));
    googleResample.pipe(recognizeStream);
    function endStream(stream, connection) {
      connection.play('./Sounds/ping_end.mp3', { volume: 0.8 });
      stream.end();
      delete recognizeStream;
      return;
    }
    setTimeout(endStream, 4000, googleResample, connection);
    return;
  }
  detector.on('hotword', hotwordCallback);

  const resampledStream = oneChannelStream.pipe(resample)
  resampledStream.pipe(detector);

  return [hotwordCallback, detector, resample, oneChannelStream, audioStream]
}

function endStream(streamArr) {
  if (!streamArr) {
    return
  }
  streamArr[1].removeListener("hotword", streamArr[0]);
  for (let i=1; i<5; i++) {
    streamArr[i].end();
  }
  return;
}

client.on("voiceStateUpdate", (oldState, newState) => {
  // if i joined a channel
  if (newState.member === newState.guild.me && newState.channelID && oldState.channelID !== newState.channelID) {
    const connection = newState.connection;
    connection.once("ready", () => {
      console.log("connection made");
      connection.play(new Silence(), {type: 'opus'});
    })
    fs.mkdir(`./Sounds/${newState.channelID}`, (err) => {
      console.log(`directory deleted`);
    });
    const initialMembers = newState.channel.members.clone();
    initialMembers.each((member) => {
      member["streamArr"] = createStream(connection, member)
    })

    // detect when someone leaves, or if I leave, remove listener
    const updateCallback = (oState, nState) => {
      if (nState.member === nState.guild.me && oState.channelID !== nState.channelID) {
        console.log("Leaving channel");
        client.removeListener("voiceStateUpdate", updateCallback);
        initialMembers.each((member) => {
          endStream(member.streamArr)
        })
        fs.rmdir(`./Sounds/${newState.channelID}`, { recursive: true }, (err) => {
          console.log(`directory deleted`);
        });
        return;
      }
      if (oState.channelID === newState.channelID && oState.channelID !== nState.channelID) {
        if (initialMembers.get(oState.id)) {
          const streams = initialMembers.get(oState.id).streamArr;
          endStream(streams);
          console.log(`${nState.member.displayName} has left`);
          initialMembers.delete(oState.id)
        }
      }
    }
    client.on("voiceStateUpdate", updateCallback)
  }
  // If someone joins the channel
  else if (newState.channel === newState.guild.me.voice.channel && oldState.channelID !== newState.channelID && newState.member !== newState.guild.me) {
    const connection = newState.guild.me.voice.connection;
    const streamArr = createStream(connection, newState.member);
    console.log(`${newState.member.displayName} has joined xd`);

    // detecting when the member leaves or if I leave
    const updateCallback2 = (oState, nState) => {
      if ((nState.member === newState.member && oState.channelID !== nState.channelID) || (nState.member === nState.guild.me && oState.channelID !== nState.channelID)) {
        endStream(streamArr);
        client.removeListener("voiceStateUpdate", updateCallback2);
        console.log(`${nState.member.displayName} has left xd`, client.listenerCount("voiceStateUpdate"))
        return;
      }
    }
    client.on("voiceStateUpdate", updateCallback2)
  }
})

