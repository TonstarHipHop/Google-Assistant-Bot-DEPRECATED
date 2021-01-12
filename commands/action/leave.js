module.exports = {
    name: "leave",
    aliases: ["dc", "disconnect"],
    description: "Leaves your channel",
    execute: async (client, message, args, member) => {
        if (!message) {
            member.guild.me.voice.channel.leave().catch(() => console.log(`Couldn't leave channel`));
            return `Left ${message.member.voice.channel.name}`
        }
        else if(!message.guild.me.voice.channel || message.member.voice.channel !== message.guild.me.voice.channel)
            message.channel.send("Not in a voice channel").catch(() => console.log("Couldn't send message"));
        else {
            message.member.voice.channel.leave();
            console.log(`Left ${message.member.voice.channel.name}`);
        }
    }
}