var app = angular.module('devboard', ['socket.io']);

app.config(function ($socketProvider) {
    $socketProvider.setConnectionUrl(window.location.hostname + ':' + window.location.port);
});

app.controller('boardController', ['$socket', function($socket) {
    this.jobs = [];
    this.allJobs = {};
    this.view = {};
    var that = this;

    $socket.on('reload', function() {
        location.reload();
    });

    $socket.emit('view-req', 'live');

    $socket.on('view-res', function(data) {
        that.view = data;
    });

    $socket.on('jobs-res', function(data) {
        that.allJobs = {};
        that.jobs = [];

        data.forEach(function(element) {
            switch (element.status) {
                case 'success':
                    element.colour = 'green';
                    break;
                case 'failed':
                    element.colour = 'red';
                    break;
                case 'building':
                    switch (element.pastStatus) {
                        case 'success':
                            element.colour = 'green';
                            break;
                        case 'failed':
                            element.colour = 'red';
                            break;
                        case 'idle':
                            element.colour = 'grey';
                            break;
                    }
                    break;
            }

            that.allJobs[element.name] = element;
        });

        that.view.jobs.forEach(function(name){
            that.jobs.push(that.allJobs[name]);
        });
    });
}]);