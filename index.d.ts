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