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
    
    if (Math.random() > 0.5) {
        $socket.emit('view-req', 'live');        
    } else {
        $socket.emit('view-req', 'project');
    }

    $socket.on('view-res', function(data) {
        that.view = data;
    });

    $socket.on('jobs-res', function(data) {
        that.allJobs = {};
        that.jobs = [];

        data.forEach(function(element) {
            switch (element.status) {
                case 'success':
                    element.colour = 'green darken-4';
                    break;
                case 'failed':
                    element.colour = 'red darken-4';
                    break;
                case 'aborted':
                    element.colour = 'grey darken-2';
                    break;
                case 'building':
                    switch (element.pastStatus) {
                        case 'success':
                        element.colour = 'green darken-3';
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

        that.view.jobs.forEach(function(jobDef){
            var job = that.allJobs[jobDef.name];

            job.displayName = jobDef.displayName;
            job.width = jobDef.width;

            that.jobs.push(job);
        });
    });
}]);