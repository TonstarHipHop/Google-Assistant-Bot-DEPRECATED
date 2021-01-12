module.exports = {
    getMember: function(message, toFind = '') {
        toFind = toFind.toLowerCase();
        let target = message.guild.members.cache.has(toFind);
        if(!target && message.mentions.members)
            target = message.mentions.members.first();

        if (!target && toFind) {
            target = message.guild.members.find(member => {
                return member.displayName.toLowerCase().includes(toFind) ||
                member.user.tag.toLowerCase().includes(toFind)
            })
        }
        

        if (!target)
            target = message.member;
        return target;
    },

    formatDate: function(date) {
        return new Intl.DateTimeFormat('en-US').format(date);
    },

    convertBufferTo1Channel: function(buffer) {
        const convertedBuffer = Buffer.alloc(buffer.length / 2)
      
        for (let i = 0; i < convertedBuffer.length / 2; i++) {
          const uint16 = buffer.readUInt16LE(i * 4)
          convertedBuffer.writeUInt16LE(uint16, i * 2)
        }
      
        return convertedBuffer
    },
}

