/**
 * GPX file parser
 */
export default class GPXParser {
  xmlSource: Document | "" = "";
  metadata: MetaData = {};
  waypoints: Waypoint[] = [];
  tracks: Track[] = [];
  routes: Route[] = [];

  /**
   * Parse a gpx formatted string to a GPXParser Object
   * 
   * @param gpxString - A GPX formatted String
   * 
   * @return A GPXParser object
   */
  parse(gpxString: string): GPXParser {
    const domParser = new window.DOMParser();
    this.xmlSource = domParser.parseFromString(gpxString, 'text/xml');

    const metadata = this.xmlSource.querySelector('metadata');
    if (metadata != null) {
      this.metadata.name = this.getElementValue(metadata, "name");
      this.metadata.desc = this.getElementValue(metadata, "desc");
      this.metadata.time = this.getElementValue(metadata, "time");

      const author: Author = {};
      const authorElem = metadata.querySelector('author');
      if (authorElem != null) {
        author.name = this.getElementValue(authorElem, "name");
        author.email = {};
        const emailElem = authorElem.querySelector('email');
        if (emailElem != null) {
          author.email.id = emailElem.getAttribute("id")!;
          author.email.domain = emailElem.getAttribute("domain")!;
        }

        const link: Link = {};
        const linkElem = authorElem.querySelector('link');
        if (linkElem != null) {
          link.href = linkElem.getAttribute('href')!;
          link.text = this.getElementValue(linkElem, "text");
          link.type = this.getElementValue(linkElem, "type");
        }
        author.link = link;
      }
      this.metadata.author = author;

      const link: Link = {};
      const linkElem = this.queryDirectSelector(metadata, 'link');
      if (linkElem != null) {
        link.href = linkElem.getAttribute('href')!;
        link.text = this.getElementValue(linkElem, "text");
        link.type = this.getElementValue(linkElem, "type");
        this.metadata.link = link;
      }
    }

    const wpts = [...this.xmlSource.querySelectorAll('wpt')];
    for (const idx in wpts) {
      const wpt = wpts[idx];
      const pt: Waypoint = {};
      pt.name = this.getElementValue(wpt, "name");
      pt.sym = this.getElementValue(wpt, "sym");
      pt.lat = parseFloat(wpt.getAttribute("lat")!);
      pt.lon = parseFloat(wpt.getAttribute("lon")!);

      const floatValue = parseFloat(this.getElementValue(wpt, "ele"));
      pt.ele = isNaN(floatValue) ? null : floatValue;

      pt.cmt = this.getElementValue(wpt, "cmt");
      pt.desc = this.getElementValue(wpt, "desc");

      const time = this.getElementValue(wpt, "time");
      pt.time = time == null ? null : new Date(time);

      this.waypoints.push(pt);
    }

    const rtes = [...this.xmlSource.querySelectorAll('rte')];
    for (const idx in rtes) {
      const rte = rtes[idx];
      const route: Route = {};
      route.name = this.getElementValue(rte, "name");
      route.cmt = this.getElementValue(rte, "cmt");
      route.desc = this.getElementValue(rte, "desc");
      route.src = this.getElementValue(rte, "src");
      route.number = this.getElementValue(rte, "number");

      const type = this.queryDirectSelector(rte, "type");
      route.type = type != null ? type.innerHTML : null;

      const link: Link = {};
      const linkElem = rte.querySelector('link');
      if (linkElem != null) {
        link.href = linkElem.getAttribute('href')!;
        link.text = this.getElementValue(linkElem, "text");
        link.type = this.getElementValue(linkElem, "type");
      }
      route.link = link;

      const routepoints: Point[] = [];
      const rtepts = [...rte.querySelectorAll('rtept')];

      for (const idxIn in rtepts) {
        const rtept = rtepts[idxIn];
        const pt: Point = {};
        pt.lat = parseFloat(rtept.getAttribute("lat")!);
        pt.lon = parseFloat(rtept.getAttribute("lon")!);

        const floatValue = parseFloat(this.getElementValue(rtept, "ele"));
        pt.ele = isNaN(floatValue) ? null : floatValue;

        const time = this.getElementValue(rtept, "time");
        pt.time = time == null ? null : new Date(time);

        routepoints.push(pt);
      }

      route.distance = this.calculDistance(routepoints);
      route.elevation = this.calcElevation(routepoints);
      route.slopes = this.calculSlope(routepoints, route.distance.cumul);
      route.points = routepoints;

      this.routes.push(route);
    }

    const trks = [...this.xmlSource.querySelectorAll('trk')];
    for (const idx in trks) {
      const trk = trks[idx];
      const track: Track = {};

      track.name = this.getElementValue(trk, "name");
      track.cmt = this.getElementValue(trk, "cmt");
      track.desc = this.getElementValue(trk, "desc");
      track.src = this.getElementValue(trk, "src");
      track.number = this.getElementValue(trk, "number");

      const type = this.queryDirectSelector(trk, "type");
      track.type = type != null ? type.innerHTML : null;

      const link: Link = {};
      const linkElem = trk.querySelector('link');
      if (linkElem != null) {
        link.href = linkElem.getAttribute('href')!;
        link.text = this.getElementValue(linkElem, "text");
        link.type = this.getElementValue(linkElem, "type");
      }
      track.link = link;

      const trackpoints: Point[] = [];
      const trkpts = [...trk.querySelectorAll('trkpt')];
      for (const idxIn in trkpts) {
        const trkpt = trkpts[idxIn];
        const pt: Point = {};
        pt.lat = parseFloat(trkpt.getAttribute("lat")!);
        pt.lon = parseFloat(trkpt.getAttribute("lon")!);

        const floatValue = parseFloat(this.getElementValue(trkpt, "ele"));
        pt.ele = isNaN(floatValue) ? null : floatValue;

        const time = this.getElementValue(trkpt, "time");
        pt.time = time == null ? null : new Date(time);

        trackpoints.push(pt);
      }
      track.distance = this.calculDistance(trackpoints);
      track.elevation = this.calcElevation(trackpoints);
      track.slopes = this.calculSlope(trackpoints, track.distance.cumul);
      track.points = trackpoints;

      this.tracks.push(track);
    }

    return this;
  }

  /**
   * Get value from a XML DOM element
   * 
   * @param parent - Parent DOM Element
   * @param needle - Name of the searched element
   * 
   * @return The element value
   */
  getElementValue(parent: Element, needle: string) {
    const elem = parent.querySelector(needle);
    if (elem != null) {
      return elem.innerHTML != undefined ? elem.innerHTML : elem.childNodes[0].data;
    }
    return elem;
  }

  /**
   * Search the value of a direct child XML DOM element
   * 
   * @param parent - Parent DOM Element
   * @param needle - Name of the searched element
   * 
   * @return The element value
   */
  queryDirectSelector(parent: Element, needle: string): Element {
    const elements = parent.querySelectorAll(needle);
    let finalElem = elements[0];

    if (elements.length > 1) {
      const directChilds = parent.childNodes;

      for (const idx in directChilds) {
        const elem = directChilds[idx];
        if (elem.tagName === needle) {
          finalElem = elem;
        }
      }
    }

    return finalElem;
  }

  /**
   * Calcul the Distance Object from an array of points
   * 
   * @param points - An array of points with lat and lon properties
   * 
   * @return An object with total distance and Cumulative distances
   */
  calculDistance(points: Point[]): Distance {
    const distance: Distance = {};
    let totalDistance = 0;
    const cumulDistance = [];
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calcDistanceBetween(points[i], points[i + 1]);
      cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    distance.total = totalDistance;
    distance.cumul = cumulDistance;

    return distance;
  }

  /**
   * Calcul Distance between two points with lat and lon
   * 
   * @param wpt1 - A geographic point with lat and lon properties
   * @param wpt2 - A geographic point with lat and lon properties
   * 
   * @returns The distance between the two points
   */
  calcDistanceBetween(wpt1: Point, wpt2: Point): number {
    const latlng1: Point = {};
    latlng1.lat = wpt1.lat;
    latlng1.lon = wpt1.lon;
    const latlng2: Point = {};
    latlng2.lat = wpt2.lat;
    latlng2.lon = wpt2.lon;
    const rad = Math.PI / 180,
      lat1 = latlng1.lat * rad,
      lat2 = latlng2.lat * rad,
      sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
      sinDLon = Math.sin((latlng2.lon - latlng1.lon) * rad / 2),
      a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  }

  /**
   * Generate Elevation Object from an array of points
   * 
   * @param points - An array of points with ele property
   * 
   * @returns An object with negative and positive height difference and average, max and min altitude data
   */
  calcElevation(points: Point[]): Elevation {
    let dp = 0,
      dm = 0,
      ret: Elevation = {};

    for (let i = 0; i < points.length - 1; i++) {
      const rawNextElevation = points[i + 1].ele;
      const rawElevation = points[i].ele;

      if (rawNextElevation !== null && rawElevation !== null) {
        const diff = parseFloat(rawNextElevation) - parseFloat(rawElevation);

        if (diff < 0) {
          dm += diff;
        } else if (diff > 0) {
          dp += diff;
        }
      }
    }

    const elevation: number[] = [];
    let sum = 0;

    for (let i = 0, len = points.length; i < len; i++) {
      const rawElevation = points[i].ele;

      if (rawElevation !== null) {
        const ele = parseFloat(points[i].ele);
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
  }

  /**
   * Generate slopes Object from an array of Points and an array of Cumulative distance 
   * 
   * @param points - An array of points with ele property
   * @param cumul - An array of cumulative distance
   * 
   * @returns An array of slopes
   */
  calculSlope(points: Point[], cumul: number[]): number[] {
    const slopes: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      const nextPoint = points[i + 1];
      const elevationDiff = nextPoint.ele - point.ele;
      const distance = cumul[i + 1] - cumul[i];

      const slope = (elevationDiff * 100) / distance;
      slopes.push(slope);
    }

    return slopes;
  }

  /**
   * Export the GPX object to a GeoJSON formatted Object
   * 
   * @returns a GeoJSON formatted Object
   */
  toGeoJSON() {
    const GeoJSON = {
      type: "FeatureCollection",
      features: [] as { type: string; geometry: { type: string; coordinates: [number, number, number | null][]; }; properties: Track; }[],
      properties: {
        name: this.metadata.name,
        desc: this.metadata.desc,
        time: this.metadata.time,
        author: this.metadata.author,
        link: this.metadata.link,
      },
    };

    for (const idx in this.tracks) {
      const track = this.tracks[idx];

      const feature: typeof GeoJSON.features[number] = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: []
        },
        properties: {
          name: track.name,
          cmt: track.cmt,
          desc: track.desc,
          src: track.src,
          number: track.number,
          link: track.link,
          type: track.type
        }
      };

      for (const idx in track.points) {
        const pt = track.points[idx];

        const geoPt: typeof GeoJSON.features[number]["geometry"]["coordinates"][number] = [
          pt.lon,
          pt.lat,
          pt.ele
        ];

        feature.geometry.coordinates.push(geoPt);
      }

      GeoJSON.features.push(feature);
    }

    for (const idx in this.routes) {
      const track = this.routes[idx];

      const feature: typeof GeoJSON.features[number] = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: []
        },
        properties: {
          name: track.name,
          cmt: track.cmt,
          desc: track.desc,
          src: track.src,
          number: track.number,
          link: track.link,
          type: track.type
        }
      };

      for (const idx in track.points) {
        const pt = track.points[idx];

        const geoPt: typeof GeoJSON.features[number]["geometry"]["coordinates"][number] = [
          pt.lon,
          pt.lat,
          pt.ele
        ];

        feature.geometry.coordinates.push(geoPt);
      }

      GeoJSON.features.push(feature);
    }

    for (const idx in this.waypoints) {
      const pt = this.waypoints[idx];

      const feature: typeof GeoJSON.features[number] = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: []
        },
        properties: {
          name: pt.name,
          sym: pt.sym,
          cmt: pt.cmt,
          desc: pt.desc
        }
      };

      feature.geometry.coordinates = [pt.lon, pt.lat, pt.ele];

      GeoJSON.features.push(feature);
    }

    return GeoJSON;
  }
}

if (typeof module !== 'undefined') {
  require('jsdom-global')();
}

export interface MetaData {
  name: string;
  desc: string;
  link: Link;
  author: Author;
  time: Date;
}

export interface Waypoint {
  name: string;
  sym: string;
  cmt: string;
  desc: string;
  lat: number;
  lon: number;
  ele: number | null;
  time: Date | null;
}

export interface Track {
  name: string;
  cmt: string;
  desc: string;
  src: string;
  number: string;
  link: Link;
  type: string | null;
  points: Point[];
  distance: Distance;
  elevation: Elevation;
  slopes: number[];
}

export interface Route {
  name: string;
  cmt: string;
  desc: string;
  src: string;
  number: string;
  link: Link;
  type: string | null;
  points: Point[];
  distance: Distance;
  elevation: Elevation;
  slopes: number[];
}

export interface Point {
  lat: number;
  lon: number;
  ele: number | null;
  time: Date | null;
}

export interface Distance {
  total: number;
  cumul: number[];
}

export interface Elevation {
  max: number | null;
  min: number | null;
  pos: number | null;
  neg: number | null;
  avg: number | null;
}

export interface Author {
  name: string;
  email: Email;
  link: Link;
}

export interface Email {
  id: string;
  domain: string;
}

export interface Link {
  href: string;
  text: string;
  type: string;
}