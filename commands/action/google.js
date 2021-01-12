const GoogleAssistant = require('../../googleassistant');
const deviceCredentials = require('../../devicecredentials.json');
const CREDENTIALS = {
    client_id: deviceCredentials.client_id,
    client_secret: deviceCredentials.client_secret,
    refresh_token: deviceCredentials.refresh_token,
    type: "authorized_user"
};

const assistant = new GoogleAssistant(CREDENTIALS);

module.exports = {
    name: "google",
    aliases: ["hey google", "ok google"],
    category: "action",
    description: "",
    usage: "",
    run: async (client, message, args, member) => {
        if (args.length < 1 && message) {
            return message.reply("Nothing to say?");
        }
        const query = args.join(" ");
        let response = null;
        await assistant.assist(query).then(({ text }) => {
            console.log(`Assistant response:\n${text}`);
            response = text;
            if (message) {
                message.channel.send(text).catch(() => message.channel.send("Sorry, I didn't understand, maybe stop speaking ape?"));
            } 
        });
        return response; 
    }
}