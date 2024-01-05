import type { MetaData, Waypoint, Track, Route, Author, Link, Point, Distance, Elevation } from "../index.js";

/**
 * GPX file parser
 * 
 * @constructor
 */
class gpxParser {

xmlSource: Document | "" = "";
metadata: MetaData  = {};
waypoints: Waypoint[] = [];
tracks: Track[]    = [];
routes: Route[]    = [];

/**
 * Parse a gpx formatted string to a GPXParser Object
 * 
 * @param gpxstring - A GPX formatted String
 * 
 * @return A GPXParser object
 */
parse(gpxstring: string): gpxParser {
    let keepThis = this;

    let domParser = new window.DOMParser();
    this.xmlSource = domParser.parseFromString(gpxstring, 'text/xml');

    let metadata = this.xmlSource.querySelector('metadata');
    if(metadata != null){
        this.metadata.name  = this.getElementValue(metadata, "name");
        this.metadata.desc  = this.getElementValue(metadata, "desc");
        this.metadata.time  = this.getElementValue(metadata, "time");

        let author: Author = {};
        let authorElem = metadata.querySelector('author');
        if(authorElem != null){
            author.name = this.getElementValue(authorElem, "name");
            author.email  = {};
            let emailElem = authorElem.querySelector('email');
            if(emailElem != null){
                author.email.id     = emailElem.getAttribute("id");
                author.email.domain = emailElem.getAttribute("domain");
            }

            let link: Link     = {};
            let linkElem = authorElem.querySelector('link');
            if(linkElem != null){
                link.href = linkElem.getAttribute('href');
                link.text = this.getElementValue(linkElem, "text");
                link.type = this.getElementValue(linkElem, "type");
            }
            author.link = link;
        }
        this.metadata.author = author;

        let link: Link = {};
        let linkElem = this.queryDirectSelector(metadata, 'link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = this.getElementValue(linkElem, "text");
            link.type = this.getElementValue(linkElem, "type");
            this.metadata.link = link;
        }
    }

    var wpts = [...this.xmlSource.querySelectorAll('wpt')];
    for (let idx in wpts){
        var wpt = wpts[idx];
        let pt: Waypoint  = {};
        pt.name = keepThis.getElementValue(wpt, "name");
        pt.sym  = keepThis.getElementValue(wpt, "sym");
        pt.lat  = parseFloat(wpt.getAttribute("lat"));
        pt.lon  = parseFloat(wpt.getAttribute("lon"));

        let floatValue = parseFloat(keepThis.getElementValue(wpt, "ele")); 
        pt.ele = isNaN(floatValue) ? null : floatValue;

        pt.cmt  = keepThis.getElementValue(wpt, "cmt");
        pt.desc = keepThis.getElementValue(wpt, "desc");

        let time = keepThis.getElementValue(wpt, "time");
        pt.time = time == null ? null : new Date(time);

        keepThis.waypoints.push(pt);
    }

    var rtes = [...this.xmlSource.querySelectorAll('rte')];
    for (let idx in rtes){
        let rte = rtes[idx];
        let route: Route = {};
        route.name   = keepThis.getElementValue(rte, "name");
        route.cmt    = keepThis.getElementValue(rte, "cmt");
        route.desc   = keepThis.getElementValue(rte, "desc");
        route.src    = keepThis.getElementValue(rte, "src");
        route.number = keepThis.getElementValue(rte, "number");

        let type     = keepThis.queryDirectSelector(rte, "type");
        route.type   = type != null ? type.innerHTML : null;

        let link: Link     = {};
        let linkElem = rte.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        route.link = link;

        let routepoints: Point[] = [];
        var rtepts = [...rte.querySelectorAll('rtept')];

        for (let idxIn in rtepts){
            let rtept = rtepts[idxIn];
            let pt: Point    = {};
            pt.lat    = parseFloat(rtept.getAttribute("lat"));
            pt.lon    = parseFloat(rtept.getAttribute("lon"));

            let floatValue = parseFloat(keepThis.getElementValue(rtept, "ele")); 
            pt.ele = isNaN(floatValue) ? null : floatValue;

            let time = keepThis.getElementValue(rtept, "time");
            pt.time = time == null ? null : new Date(time);

            routepoints.push(pt);
        }

        route.distance  = keepThis.calculDistance(routepoints);
        route.elevation = keepThis.calcElevation(routepoints);
        route.slopes    = keepThis.calculSlope(routepoints, route.distance.cumul);
        route.points    = routepoints;

        keepThis.routes.push(route);
    }

    var trks = [...this.xmlSource.querySelectorAll('trk')];
    for (let idx in trks){
        let trk = trks[idx];
        let track: Track = {};

        track.name   = keepThis.getElementValue(trk, "name");
        track.cmt    = keepThis.getElementValue(trk, "cmt");
        track.desc   = keepThis.getElementValue(trk, "desc");
        track.src    = keepThis.getElementValue(trk, "src");
        track.number = keepThis.getElementValue(trk, "number");

        let type     = keepThis.queryDirectSelector(trk, "type");
        track.type   = type != null ? type.innerHTML : null;

        let link: Link     = {};
        let linkElem = trk.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        track.link = link;

        let trackpoints: Point[] = [];
        let trkpts = [...trk.querySelectorAll('trkpt')];
	    for (let idxIn in trkpts){
            var trkpt = trkpts[idxIn];
            let pt: Point = {};
            pt.lat = parseFloat(trkpt.getAttribute("lat"));
            pt.lon = parseFloat(trkpt.getAttribute("lon"));

            let floatValue = parseFloat(keepThis.getElementValue(trkpt, "ele")); 
            pt.ele = isNaN(floatValue) ? null : floatValue;

            let time = keepThis.getElementValue(trkpt, "time");
            pt.time = time == null ? null : new Date(time);

            trackpoints.push(pt);
        }
        track.distance  = keepThis.calculDistance(trackpoints);
        track.elevation = keepThis.calcElevation(trackpoints);
        track.slopes    = keepThis.calculSlope(trackpoints, track.distance.cumul);
        track.points    = trackpoints;

        keepThis.tracks.push(track);
    }

    return this;
};

/**
 * Get value from a XML DOM element
 * 
 * @param parent - Parent DOM Element
 * @param needle - Name of the searched element
 * 
 * @return The element value
 */
getElementValue(parent: Element, needle: string){
    let elem = parent.querySelector(needle);
    if(elem != null){
        return elem.innerHTML != undefined ? elem.innerHTML : elem.childNodes[0].data;
    }
    return elem;
};


/**
 * Search the value of a direct child XML DOM element
 * 
 * @param parent - Parent DOM Element
 * @param needle - Name of the searched element
 * 
 * @return The element value
 */
queryDirectSelector(parent: Element, needle: string) {

    let elements  = parent.querySelectorAll(needle);
    let finalElem = elements[0];

    if(elements.length > 1) {
        let directChilds = parent.childNodes;

        for(let idx in directChilds) {
            let elem = directChilds[idx];
            if(elem.tagName === needle) {
                finalElem = elem;
            }
        }
    }

    return finalElem;
};

/**
 * Calcul the Distance Object from an array of points
 * 
 * @param points - An array of points with lat and lon properties
 * 
 * @return An object with total distance and Cumulative distances
 */
calculDistance(points: Point[]): Distance {
    let distance: Distance = {};
    let totalDistance = 0;
    let cumulDistance = [];
    for (var i = 0; i < points.length - 1; i++) {
        totalDistance += this.calcDistanceBetween(points[i],points[i+1]);
        cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    distance.total = totalDistance;
    distance.cumul = cumulDistance;

    return distance;
};

/**
 * Calcul Distance between two points with lat and lon
 * 
 * @param wpt1 - A geographic point with lat and lon properties
 * @param wpt2 - A geographic point with lat and lon properties
 * 
 * @returns The distance between the two points
 */
calcDistanceBetween(wpt1: Point, wpt2: Point): number {
    let latlng1: Point = {};
    latlng1.lat = wpt1.lat;
    latlng1.lon = wpt1.lon;
    let latlng2: Point = {};
    latlng2.lat = wpt2.lat;
    latlng2.lon = wpt2.lon;
    var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad,
		    sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
		    sinDLon = Math.sin((latlng2.lon - latlng1.lon) * rad / 2),
		    a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
		    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371000 * c;
};

/**
 * Generate Elevation Object from an array of points
 * 
 * @param points - An array of points with ele property
 * 
 * @returns An object with negative and positive height difference and average, max and min altitude data
 */
calcElevation(points: Point[]): Elevation {
    var dp = 0,
        dm = 0,
        ret: Elevation = {};

    for (var i = 0; i < points.length - 1; i++) {
        let rawNextElevation = points[i + 1].ele;
        let rawElevation =  points[i].ele;

        if(rawNextElevation !== null && rawElevation !== null) {
            let diff = parseFloat(rawNextElevation) - parseFloat(rawElevation);

            if (diff < 0) {
                dm += diff;
            } else if (diff > 0) {
                dp += diff;
            }
        }
    }

    var elevation: number[] = [];
    var sum = 0;

    for (var i = 0, len = points.length; i < len; i++) {
        let rawElevation = points[i].ele;

        if(rawElevation !== null) {
            var ele = parseFloat(points[i].ele);
            elevation.push(ele);
            sum += ele;
        }
    }

    ret.max = Math.max.apply(null, elevation) || null;
    ret.min = Math.min.apply(null, elevation) || null;
    ret.pos = Math.abs(dp) || null;
    ret.neg = Math.abs(dm) || null;
    ret.avg = sum / elevation.length || null;

    return ret;
};

/**
 * Generate slopes Object from an array of Points and an array of Cumulative distance 
 * 
 * @param points - An array of points with ele property
 * @param cumul - An array of cumulative distance
 * 
 * @returns An array of slopes
 */
calculSlope(points: Point[], cumul: number[]): number[] {
    let slopes: number[] = [];

    for (var i = 0; i < points.length - 1; i++) {
        let point = points[i];
        let nextPoint = points[i+1];
        let elevationDiff = nextPoint.ele - point.ele;
        let distance = cumul[i+1] - cumul[i];

        let slope = (elevationDiff * 100) / distance;
        slopes.push(slope);
    }

    return slopes;
};

/**
 * Export the GPX object to a GeoJSON formatted Object
 * 
 * @returns a GeoJSON formatted Object
 */
toGeoJSON() {
    var GeoJSON = {
        "type": "FeatureCollection",
        "features": [] as { type: string; geometry: { type: string; coordinates: [number, number, number | null][]; }; properties: Track; }[],
        "properties": {
            "name": this.metadata.name,
            "desc": this.metadata.desc,
            "time": this.metadata.time,
            "author": this.metadata.author,
            "link": this.metadata.link,
        },
    };

    for(let idx in this.tracks) {
        let track = this.tracks[idx];

        let feature: typeof GeoJSON.features[number] = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;

        for(let idx in track.points) {
            let pt = track.points[idx];
        
            let geoPt: typeof GeoJSON.features[number]["geometry"]["coordinates"][number] = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for(let idx in this.routes) {
        let track = this.routes[idx];

        let feature: typeof GeoJSON.features[number] = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;


        for(let idx in track.points) {
            let pt = track.points[idx];
        
            let geoPt: typeof GeoJSON.features[number]["geometry"]["coordinates"][number] = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for(let idx in this.waypoints) {
        let pt = this.waypoints[idx];
    
        let feature: typeof GeoJSON.features[number] = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name = pt.name;
        feature.properties.sym = pt.sym;
        feature.properties.cmt  = pt.cmt;
        feature.properties.desc = pt.desc;

        feature.geometry.coordinates = [pt.lon, pt.lat, pt.ele];

        GeoJSON.features.push(feature);
    }

    return GeoJSON;
};

}

if(typeof module !== 'undefined'){
    require('jsdom-global')();
    module.exports = gpxParser;
}
