import {Http} from './http';
import {extractEntity} from './extractor';

import uriTemplates from 'npm:uri-templates';

var http = new Http;

function fillUriTemplate(params = {}) {
  return function(uri) {
    return uriTemplates(uri).fillFromObject(params);
  };
}

function defProperty(obj, propName, value) {
  Object.defineProperty(obj, propName, {
    value: value
  });
}

function isDefined(value) {
  return typeof value !== 'undefined';
}



export class Resource {
  constructor(uri, response) {
    if (! uri) {
      throw new Error('Missing required uri argument to Resource');
    }

    // uri may be a String or a Promise[String] - flatten to Promise[String]
    defProperty(this, 'uri', Promise.resolve(uri));

    // Optional content response promise
    if (isDefined(response)) {
      // may be data or promise -- flatten to Promise
      defProperty(this, 'responsePromise', Promise.resolve(response));
      // FIXME: NOT READABLE?
    }
    // FIXME: else read-only, not writable
    // TODO: else lazy GET?
  }


  /* == HTTP methods == */

  /**
   * @return {Resource}
   */
  get(params = {}) {
    // FIXME: must return Resource, not Promise[Resource] - but how do we know it's a Hyper resource?
    var getResp = this.uri.then(uri => http.get(uri, params)).then(extractEntity);
    return new Resource(this.uri, getResp);
  }

  /**
   * @return {Promise[Any]}
   */
  post(data) {
    // TODO: extract top-level Resource in response if any
    return this.uri.then(uri => http.post(uri, data)).then(extractEntity);
  }

  /**
   * @return {Resource}
   */
  put(data) {
    var putResp = this.uri.then(uri => http.put(uri, data)).then(extractEntity);
    // FIXME: Content of returned Resource is either the server response to
    // the PUT or, if none, the current response with the new data?
    return new Resource(this.uri, putResp.then(resp => resp /* or current... */));
  }

  /**
   * @return {Resource}
   */
  patch(data) {
    var patchResp = this.uri.then(uri => http.put(uri, data)).then(extractEntity);
    // FIXME: Content of returned Resource is either the server response to
    // the PATCH or, if none, the current response with the patch?
    return new Resource(this.uri, patchResp.then(resp => resp /* or current... */));
  }

  /**
   * @return {Promise[Any]}
   */
  delete() {
    return this.uri.then(uri => http.delete(uri)).then(extractEntity);
  }


  /* == Resource content == */

  get data() {
    // TODO: does get() return a Promise[Resource], Promise[Any] data, Resource?
    // returns Promise[Any] of the data?
    if (this.hasOwnProperty('responsePromise')) {
      return this.responsePromise.then(resp => resp.data);
    } else {
      // FIXME: so lazy resource must allow self-promise resolution?
      return this.get().data;
    }
    // FIXME: icky?
  }

  get links() {
    // TODO: does get() return a Promise[Resource], Promise[Any] data, Resource?
    // returns Promise[Any] of the data?
    if (this.hasOwnProperty('responsePromise')) {
      return this.responsePromise.then(resp => resp.links || []);
    } else {
      // FIXME: so lazy resource must allow self-promise resolution?
      return this.get().links;
    }
    // FIXME: icky?
  }


  /* == Helpers == */

  follow(rel, params = {}) {
    var linkHref = this.getLink(rel).then(l => l.href).then(fillUriTemplate(params));
    // FIXME: substitute params here or later in get? both? default bind param here, allow late binding in GET later?
    return new Resource(linkHref);
    // FIXME: propagation of errors if link missing?
  }

  getLink(rel) {
    return this.links.then(links => links.find(l => l.rel == rel));
    // FIXME: throw error if missing link
  }
}
