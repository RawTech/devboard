"use strict";

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var morgan = require('morgan');
var fs = require('fs');
var http = require('http');
var moment = require('moment');

var config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));

app.use(express.static(__dirname + '/public'));
app.use(morgan(config.env));

app.use('/reload', function() {
    io.emit('reload');
});

io.on('connection', function(socket){
    socket.on('view-req', function(data){
        socket.emit('view-res', config.views[data]);
    });
});

server.listen(config.listenPort);

setInterval(getJobs, 2500);

function getJobs() {
    var options = {
        host: config.jenkins.host,
        port: config.jenkins.port,
        path: '/api/json?tree=jobs[name,lastBuild[number,duration,timestamp,result],lastStableBuild[number,duration],lastFailedBuild[number,duration]]'
    };

    var callback = function(response) {
        var str = '';

        response.on('data', function(chunk) {
            str += chunk;
        });
        response.on('end', function() {
            var jobs = [];

            JSON.parse(str).jobs.forEach(function(element){
                var job = {
                    name: element.name,
                    status: 'idle',
                    progress: 1
                };

                var lastBuild = element.lastBuild;
                var lastStable = element.lastStableBuild;
                var lastFailed = element.lastFailedBuild;

                if (lastBuild !== null) {
                    switch (lastBuild.result){
                        case 'FAILURE':
                            job.status = 'failed';
                            break;
                        case 'SUCCESS':
                            job.status = 'success';
                            break;
                        case 'ABORTED':
                            job.status = 'aborted';
                            break;
                        default:
                            job.status = 'building';
                            var lastDuration = 0;

                            if (lastStable !== null && lastStable.number == lastBuild.number-1) {
                                lastDuration = lastStable.duration;
                                job.pastStatus = 'success';
                            } else if (lastFailed !== null && lastFailed.number == lastBuild.number-1) {
                                lastDuration = lastFailed.duration;
                                job.pastStatus = 'failed';
                            } else {
                                job.pastStatus = 'idle';
                            }

                            if (lastDuration) {
                                job.progress = moment().diff(moment.unix(lastBuild.timestamp/1000)) / lastDuration;
                                job.eta = moment(0).to(moment(lastDuration - (moment().unix()*1000 - lastBuild.timestamp)));

                                if (job.progress > 1) {
                                    job.progress = 1;
                                }
                            }
                    }

                    job.duration = moment(0).to(lastBuild.duration, true);
                    job.start = moment(lastBuild.timestamp).fromNow();
                    job.timestamp = lastBuild.timestamp;
                    job.number = lastBuild.number;
                }

                jobs.push(job);
            });

            jobs.sort(function(a,b){
                if (a.timestamp < b.timestamp) return 1;
                if (a.timestamp > b.timestamp) return -1;
                return 0;
            });

            io.emit('jobs-res', jobs);
        });
    };

    http.request(options, callback).end();
}

