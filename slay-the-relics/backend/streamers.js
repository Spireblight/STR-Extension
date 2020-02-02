const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const STREAMERS_FILE = 'backend/streamers.csv'

exports.streamers = {
    list: [],

    init: function() {

        var data = fs.readFileSync(STREAMERS_FILE)
        this.list = parse(data, {
            columns: true
        })
        
        console.log('streamers initialized');
        console.log(JSON.stringify(this.list))
    },

    save: function() {
        var csvWriter = createCsvWriter({
            path: STREAMERS_FILE,
            header: [
                {id: 'login', title: 'login'},
                {id: 'channel_id', title: 'channel_id'},
                {id: 'secret', title: 'secret'}
            ]
        })

        csvWriter.writeRecords(this.list)
    },

    isStreamerPresent: function (login) {
        return this.getStreamerIndex(login) >= 0
    },

    getStreamerIndex: function (login) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].login == login) {
                return i
            }
        }

        return -1;
    },

    addStreamer: function (login, channel_id, secret) {
        this.removeStreamer(login)
        this.list.push({
            login: login, 
            channel_id: channel_id,
            secret: secret
        })
    },

    removeStreamer: function (login) {
        if (this.isStreamerPresent(login)) {
            const index = this.getStreamerIndex(login);
            this.list.splice(index, 1);
        }
    },

    getChannelId: function(login) {
        if (this.isStreamerPresent(login))
            return this.list[this.getStreamerIndex(login)].channel_id
        else
            return undefined
    },

    isStreamerValid: function (login, secret) {
        console.log(login + ' ' + secret)
        for (e of this.list) {
            console.log(e.login + ' ' + e.secret)
            if (e.login == login && e.secret.toString() == secret.toString()) {
                return true
            }
        }

        return false
    }
}
