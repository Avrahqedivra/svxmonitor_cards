/*
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the'Software'), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 *  Copyright(c) 2023 F4JDN - Jean-Michel Cohen
 *  
*/

export class Client {
  private _created: number = Date.now()
  private _ip: string = ''
  private _port: number = -1
  private _callsign: string = ''
  private _protocol: string = ''
  private _connected: string = ''
  private _disconnected: string = ''
  private _start: string = ''
  private _stop: string = ''
  private _reason: string = ''
  private _logged: string = ''
  private _monitoring: number[] = []
  private _current: number = 0
  private _line: number = 0
  private _history: string[] = []

  constructor(theip: string, theport: number) {
    this._ip = theip
    this._port = theport
  }

  /**
   * IP Address getter/setter
   */
  public set ip(theip: string) {
    this._ip = theip
  }

  public get ip() {
    return this._ip
  }

  /**
   * Port getter/setter
   */
  public set port(theport: number) {
    this._port = theport
  }

  public get port() {
    return this._port
  }

  /**
   * Created getter/setter
   */
  public set created(thecreated: number) {
    this._created = thecreated
  }

  public get created() {
    return this._created
  }

  /**
   * Port getter/setter
   */
  public set line(theline: number) {
    this._line = theline
  }

  public get line() {
    return this._line
  }

  /**
   * Callsign getter/setter
   */
  public set callsign(thecallsign: string) {
    this._callsign = thecallsign
  }

  public get callsign() {
    return this._callsign
  }

  /**
   * Protocol getter/setter
   */
  public set protocol(theprotocol: string) {
    this._protocol = theprotocol
  }

  public get protocol() {
    return this._protocol
  }

  /**
   * Connection time getter/setter
   */
  public set connected(theconnected: string) {
    this._connected = theconnected
  }

  public get connected() {
    return this._connected
  }

  /**
   * Start time getter/setter
   */
  public set start(thestart: string) {
    this._start = thestart
  }

  public get start() {
    return this._start
  }

  /**
   * Stop time getter/setter
   */
  public set stop(thestop: string) {
    this._stop = thestop
  }

  public get stop() {
    return this._stop
  }

  /**
   * Diconnection time getter/setter
   */
  public set disconnected(thedisconnected: string) {
    this._disconnected = thedisconnected
  }

  public get disconnected() {
    return this._disconnected
  }

  /**
   * Diconnection reason getter/setter
   */
  public set reason(thereason: string) {
    this._reason = thereason
  }

  public get reason() {
    return this._reason
  }

  /**
   * Logged getter/setter
   */
  public set logged(thelogged: string) {
    this._logged = thelogged
  }

  public get logged() {
    return this._logged
  }

  /**
   * Monitoring getter/setter
   */
  public set monitoring(themonitoring: number[]) {
    this._monitoring = themonitoring
  }

  public get monitoring() {
    return this._monitoring
  }

  /**
   * History getter/setter
   */
  public set history(thehistory: string[]) {
    this._history = thehistory
  }

  public get history() {
    return this._history
  }

  /**
   * Current getter/setter
   */
  public set current(thecurrent: number) {
    this._current = thecurrent
  }

  public get current() {
    return this._current
  } 
}
