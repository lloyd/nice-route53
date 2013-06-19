// ----------------------------------------------------------------------------
//
// nice-route53.js
//
// Copyright (c) 2013 Mozilla Corporation.
//
// ----------------------------------------------------------------------------

var awssumAmazonRoute53 = require('awssum-amazon-route53');

// ----------------------------------------------------------------------------
// internal functions

function extractZoneId(id) {
    var m = id.match(/\/([^\/]+)$/);
    return m[1];
}

function convertListHostedZonesResponse(response) {
    // the list to return
    var zones = [];

    // if this response only has one item, then it'll be an object, not an array
    if ( Object.prototype.toString.call(response) === '[object Object]' ) {
        response = [ response ];
    }

    response.forEach(function(zone) {
        zones.push({
            id        : extractZoneId(zone.Id),
            name      : zone.Name.substr(0, zone.Name.length-1),
            reference : zone.CallerReference,
            comment   : zone.Config && zone.Config.Comment,
        });
    });

    return zones;
}

// ----------------------------------------------------------------------------
// the external API

function Route53(opts) {
    var self = this;

    // create a client
    self.client = new awssumAmazonRoute53.Route53(opts);

    return self;
}

Route53.prototype.zones = function(callback) {
    var self = this;

    // save the zones somewhere
    var zones = [];

    function listHostedZones(nextMarker, callback) {
        var args = {};
        if ( nextMarker ) {
            args.Marker = nextMarker;
        }
        self.client.ListHostedZones(args, function(err, result) {
            if (err) {
                return callback('Something went wrong');
            }

            // shortcut to the real response and save the zones
            var hostedZones = result.Body.ListHostedZonesResponse.HostedZones.HostedZone;
            zones = zones.concat(convertListHostedZonesResponse(hostedZones));

            // if this response contains IsTruncated, then we need to re-query
            if ( result.Body.ListHostedZonesResponse.IsTruncated === 'true' ) {
                return listHostedZones(result.Body.ListHostedZonesResponse.NextMarker, callback);
            }

            callback(null, zones);
        });
    }

    // start this operation
    listHostedZones(null, callback);
};

// ----------------------------------------------------------------------------

module.exports = Route53;

// ----------------------------------------------------------------------------