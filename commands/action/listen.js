module.exports = {
    name: "listen",
    aliases: ["join", "connect"],
    category: "action",
    description: "Joins your channel",
    usage: "",
    run: async (client, message, args) => {
        if (!message) {
            return null;
        }
        if(!message.member.voice.channel)
            message.channel.send("Please join a voice channel");
        else
            await message.member.voice.channel.join();
            console.log(`Joined ${message.member.voice.channel.name}`)
        return;
    }
}