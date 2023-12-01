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
import fs from 'fs'
import { WebSocketServer } from 'ws'

import http from 'http'
import https from 'https'

import * as globals from './globals.js'
import * as config from './config.js'
import * as sessionmgr from './session.js'

import { Client } from './client.js'
import { Logger } from './logger.js'
import { Utils } from './utils.js'
import { FileDownloader } from './filedownloader.js'
import { Crc16 } from './crc16.js'

export let logger: Logger
export let utils: Utils
export let crc16: Crc16

let __subscriber_ids__: any   = null
let __siteLogo_html__: any    = ''
let __buttonBar_html__: any   = ''
let __footer_html__: any      = ""
let dashboard_server: WebSocketServer = null

// system variables
const extensions: string[] = ['.ico', '.jpg', '.png', '.gif', '.svg', '.css', '.js', '.mp3', '.mp4', '.webm', '.mpeg', '.ogg', '.ppt', '.pptx', '.woff2']

export let __version__: string          = "2.2.0"
export let __sessions__: any[]          = []
export let __mobilePhone__: boolean     = false

let regExp = /\(([^)]+)\)/

enum States {
  OFFLINE=0,
  ONLINE,
  TIMEOUT,
  UNKNOWN,
}

const DATALENGTH    = 19

const SVXREFLECTOR_START = 'SvxReflector v1'
const CLIENT = 'Client'
const CONNECTED = ' connected'
const DISCONNECTED = 'disconnected:'
const LOGIN_OK_FROM = 'Login OK from'
const MONITORING = 'Monitor TG#:'
const SELECT = 'Select TG #'
const TALKERSTART = 'Talker start on '
const TALKERSTOP = 'Talker stop on '
const TALKERTOT = 'Talker audio timeout on'
const FRAMELOST = 'UDP frame(s) lost. Expected'
const UNKNOWNUSER = '*** WARNING: Unknown user'
const INVALIDUDP = '*** WARNING: Incoming UDP datagram from'
const BAILRENEW = 'Incoming UDP packet has the wrong source ip'
const AUTHFAILED = 'Authentication failed for user'
const HEARTBEAT = 'TCP heartbeat timeout'
const ALREADY = 'Already connected'

const REFLECTOR = true
const SVXLINK = false

let lastCheck: Date = new Date(0)
let logType = (config.__log_name__.indexOf('reflector') != -1) ? REFLECTOR : SVXLINK

const loadTemplate = (filename: string): string => {
  return fs.readFileSync(filename, { encoding: 'utf8', flag: 'r' })
}

function isNumeric(str){
  return /^\d+$/.test(str)
}

const replaceSystemStrings = (data: string): string => {
  if (data != null) {
    return data.replace('__THEME__',  config.__theme__)
              .replace('__SYSTEM_NAME__',  config.__system_name__)
              .replace('__SITE_LOGO__',  __siteLogo_html__)
              .replace('__VERSION__',  __version__)
              .replace('__FOOTER__',  __footer_html__)
              .replace('__BUTTON_BAR__',  __buttonBar_html__)
              .replace('__SOCKET_SERVER_PORT__',  `${config.__socketServerPort__}`)
              .replace('__DISPLAY_LINES__',  `${config.__displayLines__}`)
              .replace('__BANNER_DELAY__',  `${config.__bannerDelay__}`)
              .replace('__LAST_ACTIVE_SIZE__',  `${config.__last_active_size__}`)
              .replace('__MOBILE__',  `${__mobilePhone__}`)
              .replace('__TRAFFIC_LAST_N_DAYS__',  `${config.__traffic_last_N_days__}`)
  }
  
  return data
}

function treatDate(dateObj: Date): any {
  let month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  let day = dateObj.getDate().toString().padStart(2, '0')
  let year = dateObj.getFullYear().toString().padStart(2, '0')
  let hour = dateObj.getHours().toString().padStart(2, '0')
  let minute = dateObj.getMinutes().toString().padStart(2, '0')
  let second = dateObj.getSeconds().toString().padStart(2, '0')

  return { 'day': day, 'month': month, 'year': year, 'hour': hour, 'minute': minute, 'second': second }
}

class Monitor {
  private webServer: http.Server = null
  private svxlinkLog: string[]
  private clients: Client[] = []
  private lineIndex: number = 0
  private logline: string = ''

  constructor() {
    try {
      let allFileContents = fs.readFileSync(`${config.__log_path__}${config.__log_name__}`, { encoding: 'utf-8' } )
      this.svxlinkLog = allFileContents.split(/\r?\n/)

      /**
       *  sync to first "SvxReflector v1.99.17 Copyright (C) 2003-2023 Tobias Blomberg / SM0SVX"
       */
      for(this.lineIndex=0; this.lineIndex<this.svxlinkLog.length; this.lineIndex++) {
        if (this.svxlinkLog[this.lineIndex].indexOf(SVXREFLECTOR_START) != -1) {
          this.lineIndex++
          break
        }
      }
    }
    catch(e) {
      process.exit(-1)
    }
  }

  clientFromAddress(address: string[]): number {
    for(let i=0; i<this.clients.length; i++) {
      if (this.clients[i].ip === '127.0.0.1' || this.clients[i].ip === '0.0.0.0') {
        if (this.clients[i].ip == address[0] && this.clients[i].port == parseInt(address[1]))
          return i
      }
      else {
        if (this.clients[i].ip == address[0])
          return i
      }
    }

    return -1
  }

  clientFromCallsign(callsign: string): number {
    for(let i=0; i<this.clients.length; i++) {
      if (this.clients[i].callsign == callsign)
        return i
    }

    return -1
  }

  updateLog() {
    let clientIndex = -1
    let tokenIndex = -1
    let dataTokens = []
    let address:string[]

    let allFileContents = fs.readFileSync(`${config.__log_path__}${config.__log_name__}`, { encoding: 'utf-8' } )
    this.svxlinkLog = allFileContents.split(/\r?\n/)
    
    // console.log(this.lineIndex.toString().padStart(5, '0'))

    if (this.lineIndex > 0)
      this.lineIndex--

    for(; this.lineIndex < this.svxlinkLog.length; this.lineIndex++) {
      this.logline = this.svxlinkLog[this.lineIndex]

      // console.log(this.lineIndex.toString().padStart(5, '0') + ' ' + this.logline)

      let date = this.logline.substring(0, DATALENGTH).trim()
      let data = this.logline.substring(DATALENGTH+1).trim()

      /**
       * Client 127.0.0.1:52900 connected
       */
      if (data.startsWith(CLIENT) && data.indexOf(CONNECTED) != -1) {
        dataTokens = data.split(' ')
        address = dataTokens[1].split(':')
        
        if ((clientIndex = this.clientFromAddress(address)) == -1) {
          this.clients.push(new Client(address[0], parseInt(address[1])))
          clientIndex = this.clients.length-1
        }
        
        this.clients[clientIndex].connected = date
        this.clients[clientIndex].start = ''
        this.clients[clientIndex].stop = ''
        this.clients[clientIndex].reason = ''
        this.clients[clientIndex].line = this.lineIndex
        continue
      }

      /**
       * Client 141.98.11.95:63860 disconnected: Protocol error
       */
      if (data.startsWith(CLIENT) && data.indexOf(DISCONNECTED) != -1) {
        dataTokens = data.split(' ')
        address = dataTokens[1].split(':')
        
        if ((clientIndex = this.clientFromAddress(address)) != -1)
          this.clients.splice(clientIndex, 1)

        continue
      }

      /**
       * FXXXX-R: disconnected: .... reason ...
       */
      if (!data.startsWith(CLIENT) && (tokenIndex = data.indexOf(DISCONNECTED)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].disconnected = date
          this.clients[clientIndex].reason = data.substring(tokenIndex+DISCONNECTED.length).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }      

      /**
       * FXXXX-R: Already connected
       */
      if (!data.startsWith(CLIENT) && (tokenIndex = data.indexOf(ALREADY)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].disconnected = date
          this.clients[clientIndex].reason = data.substring(tokenIndex).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * 28.11.2023 15:46:59: FXXXX-H: TCP heartbeat timeout
       */
      if ((tokenIndex = data.indexOf(HEARTBEAT)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].reason = data.substring(tokenIndex).trim()
          this.clients[clientIndex].line = this.lineIndex  
        }

        continue
      }

      /**
       * FXXXX-R: Login OK from 127.0.0.1:52900 with protocol version 2.0
       */
      if ((tokenIndex = data.indexOf(LOGIN_OK_FROM)) != -1) {
        dataTokens = data.split(' ')

        // get callsign minus ending colon
        let callsign = dataTokens[0].slice(0, -1)
        
        // if (callsign == 'F5ZXD-R')
        //   console.log('ok')

        address = dataTokens[4].split(':')

        if ((clientIndex = this.clientFromAddress(address)) != -1) {
          this.clients[clientIndex].callsign = callsign
          this.clients[clientIndex].logged = date
          this.clients[clientIndex].protocol = dataTokens[8]
          this.clients[clientIndex].start = ''
          this.clients[clientIndex].stop = ''
          this.clients[clientIndex].reason = ''
          this.clients[clientIndex].history = []
          this.clients[clientIndex].line = this.lineIndex

          // remove previous connections same callsign
          for(let k=clientIndex-1; k>0; k--) {
            if (this.clients[k].callsign == callsign /* && (this.clients[k].ip != address[0] || this.clients[k].port != parseInt(address[1])) */)
              this.clients.splice(k, 1)
          }

          clientIndex = this.clientFromCallsign(callsign)
        }
        continue
      }

      /**
       * FXXXX-R: Monitor TG#: [ 33 ]
       */
      if ((tokenIndex = data.indexOf(MONITORING)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].monitoring = []
          this.clients[clientIndex].line = this.lineIndex

          for(let k=4; k<dataTokens.length; k++) {
            if (dataTokens[k] == ']')
              break

            if (dataTokens[k] != '0')
              this.clients[clientIndex].monitoring.push(parseInt(dataTokens[k]))
          }
        }

        continue
      }

      /**
       * FXXXX-R: Select TG #33
       */
      if ((tokenIndex = data.indexOf(SELECT)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].current = 0
          this.clients[clientIndex].line = this.lineIndex

          for(let k=0; k<this.clients[clientIndex].monitoring.length; k++) {
            if (this.clients[clientIndex].monitoring[k] == parseInt(dataTokens[3].slice(1))) {
              this.clients[clientIndex].current = this.clients[clientIndex].monitoring[k]
              break
            }
          }
        }

        continue
      }

      /**
       * FXXXX-R: Talker start on TG #33
       */
      if ((tokenIndex = data.indexOf(TALKERSTART)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].start = date
          this.clients[clientIndex].stop = ''
          this.clients[clientIndex].reason = ''
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * FXXXX-R: Talker stop on TG #33
       */
      if ((tokenIndex = data.indexOf(TALKERSTOP)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].stop = date
          this.clients[clientIndex].reason = ''
          this.clients[clientIndex].line = this.lineIndex
          this.clients[clientIndex].history.push(this.logline)
        }

        continue
      }

      /**
       * FXXXX-R: Talker audio timeout on TG #33
       */
      if ((tokenIndex = data.indexOf(TALKERTOT)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].reason = data.substring(tokenIndex).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * FXXXX-R: UDP frame(s) lost. Expected seq=600. Received seq=601
       */
      if ((tokenIndex = data.indexOf(FRAMELOST)) != -1) {
        dataTokens = data.split(' ')

        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].reason = data.substring(dataTokens[0].length).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * *** WARNING: Unknown user "(33) FXXXX H"
       */
      if ((tokenIndex = data.indexOf(UNKNOWNUSER)) != -1) {
        if ((clientIndex = this.clientFromCallsign(dataTokens[0].slice(0, -1))) != -1) {
          this.clients[clientIndex].callsign = data.substring(tokenIndex+UNKNOWNUSER.length).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * *** WARNING: Incoming UDP datagram from xx.xx.xx.xx:2537 has invalid client id 36554
       */
      if ((tokenIndex = data.indexOf(INVALIDUDP)) != -1) {
        dataTokens = data.split(' ')
        let ip = dataTokens[6].split(':')
        
        if ((clientIndex = this.clientFromAddress(ip)) != -1) {
          this.clients[clientIndex].reason = data
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      

      /**
       * *** WARNING[FXXXX-H]: Incoming UDP packet has the wrong source ip, xx.xx.xx.xx instead of yy.yy.yy.yy
       * \[([^]]+)\]
       */
      if ((tokenIndex = data.indexOf(BAILRENEW)) != -1) {
        dataTokens = data.split(' ')
        let callsign = dataTokens[1].match(/\[(.*)\]/)
        
        if (callsign && callsign.length > 1 && ((clientIndex = this.clientFromCallsign(callsign[1])) != -1)) {
          this.clients[clientIndex].reason = data
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }

      /**
       * Client 90.XXX.XXX.96:49376 Authentication failed for user "(33) FXXXX H"
       */
      if (data.startsWith(CLIENT) && (tokenIndex = data.indexOf(AUTHFAILED)) != -1) {
        dataTokens = data.split(' ')
        address = dataTokens[1].split(':')
        
        if ((clientIndex = this.clientFromAddress(address)) != -1) {
          this.clients[clientIndex].reason = data.substring(tokenIndex).trim()
          this.clients[clientIndex].line = this.lineIndex
        }

        continue
      }
    }

    // console.log(JSON.stringify(this.clients, null, 2))
  }

  /**
   * 
   * to be done https://objsal.medium.com/how-to-encode-node-js-response-from-scratch-ce520018d6
   * 
   */
  requestListener(req: any, res: any) {
    try {
      var isIpad = !!req.headers['user-agent'].match(/iPad/)
      var isAndroid = !!req.headers['user-agent'].match(/Android/)

      if (__mobilePhone__ = (isIpad || isAndroid))
        logger.info(`mobile phone connection ${req.headers['user-agent']}`)
    }
    catch(e) {
      __mobilePhone__ = false
    }

    if (config.__web_auth__) {
      let authHeader = req.headers['authorization']

      if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ndmonitor"')
        res.writeHead(401, 'Content-Type', 'text/plain')
        res.end()
        return
      }

      if (authHeader.split(' ')[0] == 'Basic') {
        let decodedData = Buffer.from(authHeader.split(' ')[1], 'base64').toString()
        let [username, password] = decodedData.split(':')

        if (crc16.compute(username, config.__web_secret_key__).toString() != password) {
          res.setHeader('WWW-Authenticate', 'Basic realm="ndmonitor"')
          res.writeHead(401, 'Content-Type', 'text/html')
          res.end()
          return
        }
        
        /**
         * authenticated, add to session and continue
         */
        let requestip = '::1' ? '127.0.0.1':req.socket.remoteAddress.replace(/^.*:/, '')
        if (!sessionmgr.sessions.hasOwnProperty(requestip)) {
          // logger.info(`adding ipaddress to session ${requestip}`)
          sessionmgr.sessions[requestip] = new sessionmgr.Session(requestip, 0)
        }
      }
    }

    const acceptedEncodings = req.headers['accept-encoding'] || ''

    let index = req.url.toString().indexOf('https://www.qrz.com/lookup/')
    if (index != -1) {
      const getqrzimage = async (protocol: any, url: string, res:any): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
          const request = protocol.get(url, (response: any) => {
            // res.writeHead(200, 'Content-Type', 'text/html')
            response.pipe(res)
          })
        })
      }

      const url = req.url.toString().substring(index)
      const protocol = !url.charAt(4).localeCompare('s') ? https : http
      getqrzimage(protocol, url, res)
      return
    }

    if (req.url.toString().endsWith('.json')) {
      let fileurl:string = req.url.toString()
      let filename: string = fileurl.substring(fileurl.lastIndexOf('/') + 1)

      let filepath = `${config.__path__}assets/${filename}`

      try {
        const gpcValue = req.header('Sec-GPC')

        if (gpcValue === '1') {
          // signal detected, do something
          logger.info(`gpc request detected`)
        }
      }
      catch(e) {
      }

      if (!fs.existsSync(filepath)) {
        logger.error(`Error file ${filepath} doesn't exists`)
        res.statusCode = 500
        res.end(`The requested file ${filename} doesn't exists`)
        return
      }

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Length', fs.statSync(filepath).size)

      const fileStream = fs.createReadStream(filepath)

      if (fileStream != null) {
        // Send the JSON file in chunks
        let isFirstChunk = true
        fileStream.on('data', (chunk) => {
          // Send the chunk to the response
          res.write(chunk)        
        })

        fileStream.on('end', () => {
          res.end()
        })

        // Handle any errors that might occur during streaming
        fileStream.on('error', (err) => {
          logger.error(`Error reading the file: ${err}`)
          res.statusCode = 500
          res.end('Internal Server Error')
        })

        fileStream.destroy()
      }

      return
    }

    let error404 = (res: any) => {
      fs.promises.readFile(`${config.__path__}pages/error404.html`)
      .then(content => {
        res.writeHead(404, 'Content-Type', 'text/html')
        res.end(content)
      })
    }

    switch (req.url) {
      case '/':
      case '/index.html':
        res.writeHead(200, "Content-Type", "text/html")
        res.end(replaceSystemStrings(loadTemplate(`${config.__path__}pages/index.html`)))
        break

      default:
        var dotOffset = req.url.lastIndexOf('.')
        if (dotOffset == -1 || !extensions.includes(req.url.substr(dotOffset))) {
          return error404(res)
        }

        var filetype = {
            '.html' : { mimetype: 'text/html', folder: '/pages'},
            '.htm' : { mimetype: 'text/html', folder: '/pages'},
            '.ico' : { mimetype: 'image/x-icon', folder: '/images'},
            '.jpg' : { mimetype: 'image/jpeg', folder: '/images'},
            '.png' : { mimetype: 'image/png', folder: '/images'},
            '.gif' : { mimetype: 'image/gif', folder: '/images'},
            '.svg' : { mimetype: 'image/svg', folder: '/images'},
            '.css' : { mimetype: 'text/css', folder: '/css' },
            '.mp3' : { mimetype: 'audio/mp3', folder: '/media' },
            '.mp4' : { mimetype: 'video/mp4', folder: '/media' },
            '.mpeg' : { mimetype: 'video/mpeg', folder: '/media' }, 
            '.ogg' : { mimetype: 'video/ogg', folder: '/media' },
            '.woff2' : { mimetype: 'font/woff2', folder: '/fonts' },
            '.webm' : { mimetype: 'video/webm', folder: '/media' },
            '.ppt' : { mimetype: 'application/vnd.ms-powerpoint', folder: '/media' },
            '.pptx' : { mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', folder: '/media' },
            '.js' :  { mimetype: 'text/javascript', folder: '/scripts' }
          } [ req.url.substr(dotOffset) ]

        let folder: string = filetype.folder
        let mimetype: string = filetype.mimetype
        let filename: string = req.url.toString()

        // any icon from old apple device
        if (filename.indexOf('apple-touch-icon') != -1)
          filename = "/apple-touch-icon.png"

        // if bitmap does not exist return site logo
        if (!fs.existsSync(`${config.__path__}${folder}${filename}`)) {
          if (folder === '/images')
            filename = '/sitelogo.png'
          else {
            res.writeHead(200, mimetype)
            res.end("")
            return
          }
        }

        try {
          fs.promises.readFile(`${config.__path__}${folder}${filename}`)
            .then(content => {
              res.writeHead(200, mimetype)
              res.end(content)
            }),
            (reason: any) => {
              return error404(res)
            }
        }
        catch(e) {
          return error404(res)
        }
      break
    }
  }

  /**
  * broadcast to socket clients
  */
  broadcast(data: any) {
    dashboard_server.clients.forEach((ws: any) => {
      // best case, request from regular page
      if (ws.fromPage) {
        ws.send(JSON.stringify(data))
      } else {
        // request from web service
        let t = data['TRAFFIC']
        let valid = false
        let requestip = ws._socket.remoteAddress.replace(/^.*:/, '')

        // cleanup before sending
        if (t['BIGEARS'])
          delete t['BIGEARS']

        if (config.__allowed__socket_clients__ != null) {
          for(let i=0; i<config.__allowed__socket_clients__.length; i++) {
            let item = config.__allowed__socket_clients__[i]
            if (item.ipaddress == requestip) {
              if (item.tglist.length == 0) {
                ws.send(JSON.stringify(data))
                break
              }

              for(let j=0; j<item.tglist.length; j++) {
                let pattern = item.tglist[j]
                let index = -1
                if (pattern == t.TGID) {
                  valid = true
                  break
                }

                if ((index = pattern.indexOf('*')) != -1 && t.TGID.startsWith(pattern.substring(0, index))) {
                  valid = true
                  break
                }

                if ((index = pattern.indexOf('..')) != -1) {
                  if (parseInt(pattern.substring(0, index)) <= parseInt(t.TGID) && parseInt(t.TGID) <= parseInt(pattern.substring(index+2))) {
                    valid = true
                    break
                  }
                }
              }

              if (valid) {
                ws.send(JSON.stringify(data))
              }
            }
          }
        }
      }
    })
  }

  postProd(data: Client[]) {
    if (!config.hide_hotspot_ip)
      return data
    
    let arrayCopy: Client[] = [...data]

    for(let i=0; i<arrayCopy.length; i++) {
      let address = arrayCopy[i].ip.split('.')
      arrayCopy[i].ip = `${address[0]}.${address[1]}.x.x`
    }

    return arrayCopy
  }

  updateDashboard() {
    // reload the log
    let stats = fs.statSync(`${config.__log_path__}${config.__log_name__}`)

    if (stats.mtime > lastCheck) {
      lastCheck = stats.mtime

      this.updateLog()

      this.broadcast({ 'TRAFFIC' : this.postProd(this.clients), 'BIGEARS': dashboard_server.clients.size.toString() })
    }
  }

  init() {
    logger = new Logger()
    utils = new Utils()
    crc16 = new Crc16()

    // must be first
    __footer_html__ = replaceSystemStrings(loadTemplate(`${config.__path__}pages/${config.__footer__}`))
    __siteLogo_html__ = replaceSystemStrings(loadTemplate(`${config.__path__}pages/${config.__siteLogo__}`))
    __buttonBar_html__ = replaceSystemStrings(loadTemplate(`${config.__path__}pages/${config.__buttonBar__}`))

    /** 
     * https://manytools.org/hacker-tools/ascii-banner/  (Rowan Cap)
     */ 
    logger.info(`${globals.__CLEAR__}${globals.__HOME__}`)

    logger.info(`${globals.__BLUE__}    .dMMMb  dMP dMP dMP dMP ${globals.__WHITE__}dMMMMMMMMb  .aMMMb  dMMMMb  ${globals.__RED__}.aMMMb  .aMMMb  dMMMMb  dMMMMb`)
    logger.info(`${globals.__BLUE__}   dMP" VP dMP dMP dMK.dMP ${globals.__WHITE__}dMP"dMP"dMP dMP"dMP dMP dMP ${globals.__RED__}dMP"VMP dMP"dMP dMP.dMP dMP VMP`)
    logger.info(`${globals.__BLUE__}   VMMMb  dMP dMP .dMMMK" ${globals.__WHITE__}dMP dMP dMP dMP dMP dMP dMP ${globals.__RED__}dMP     dMMMMMP dMMMMK" dMP dMP`)
    logger.info(`${globals.__BLUE__} dP .dMP  YMvAP" dMP"AMF ${globals.__WHITE__}dMP dMP dMP dMP.aMP dMP dMP ${globals.__RED__}dMP.aMP dMP dMP dMP"AMF dMP.aMP`)
    logger.info(`${globals.__BLUE__} VMMMP"    VP"  dMP dMP ${globals.__WHITE__}dMP dMP dMP  VMMMP" dMP dMP ${globals.__RED__} VMMMP" dMP dMP dMP dMP dMMMMP`)

    logger.info(`${globals.__RESET__}`)
    
    logger.info(`\nSVXMonitor Cards v${__version__} (c) 2023 Jean-Michel Cohen, F4JDN <f4jdn@outlook.fr>\n`)

    /**
     * Download files
     */
    const downloader = new FileDownloader()
    const envFiles: any[] = [ 
      // { path:  config.__path__, file:  config.__subscriber_file__, url:  config.__subscriber_url__, stale:  config.__file_reload__ * 24 * 3600 }
    ]

    logger.info('starting files download, be patient, it could take several minutes...')

    downloader.downloadAndWriteFiles(envFiles).then(() => {
      logger.info(`all files downloaded and saved. ${globals.__OK__}`)

      logger.info(`\nBuilding dictionaries`)

      // making subscribers dictionary
      __subscriber_ids__  = utils.mk_full_id_dict(config.__path__, config.__subscriber_file__, 'subscriber')
      if (__subscriber_ids__)
        logger.info(`ID ALIAS MAPPER: subscriber_ids dictionary is available ${globals.__OK__}`)
        

      /**
       * dashboard websocket server
       * 
       * create socket server https://github.com/websockets/ws#simple-server
       */
      try {
        logger.info(`\ncreating dashboard socket server on port:${config.__socketServerPort__}`)
        
        dashboard_server = new WebSocketServer({ 
          port: config.__socketServerPort__,
          perMessageDeflate: {
            zlibDeflateOptions: {
              // See zlib defaults.
              chunkSize: 1024,
              memLevel: 7,
              level: 3
            },
            zlibInflateOptions: {
              chunkSize: 10 * 1024
            },
            // Other options settable:
            clientNoContextTakeover: true, // Defaults to negotiated value.
            serverNoContextTakeover: true, // Defaults to negotiated value.
            serverMaxWindowBits: 10, // Defaults to negotiated value.
            // Below options specified as default values.
            concurrencyLimit: 10, // Limits zlib concurrency for perf.
            threshold: 1024 // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
          }
        })

        logger.info(`dashboard socket server created ${config.__socketServerPort__} ${globals.__OK__}`)

        dashboard_server.on("connection", (ws: any, req: any) => {
          let message: any = {}

          /**
           * get connection information (page name)
           * page name
           *
           * save that into extra properties
           * page
           * fromPage (assume true)
           * connectTime
           */
          const urlParams = new URLSearchParams(req.url.substring(1))
          ws.page = urlParams.get("page") ? urlParams.get("page") : "generic"
          ws.fromPage = true
          ws.connectTime = Date.now()

          // get ip address
          let requestip = "::1" ? "127.0.0.1" : req.socket.remoteAddress.replace(/^.*:/, "")

          /**
           * check if session management is already done by html
           * if not, means websocket direct connection
           */
          if (
            /*config.__web_auth__ &&*/ !sessionmgr.sessions.hasOwnProperty(
              requestip
            )
          ) {
            /**
             * no yet registered in session
             * it is a direct connection
             *
             * presume authentication invalid
             */
            let valid = false

            // check if we have an allowed__socket_clients list
            if (
              config.__allowed__socket_clients__ != null &&
              config.__allowed__socket_clients__.length > 0
            ) {
              // check if allowed
              for (let i = 0; i < config.__allowed__socket_clients__.length; i++) {
                let item = config.__allowed__socket_clients__[i]
                
                if (item.ipaddress == requestip) {
                  if ((item.id == "*" || item.id == ws.page) && (item.lease == "*" || 86400 * parseInt(item.lease) > Date.now())) {
                    valid = true
                    ws.fromPage = item.id != ws.page
                    break
                  }
                }
              }
            } else {
              // allow all
              valid = true
              ws.fromPage = false
            }

            if (!valid) {
              ws.terminate()
              logger.info(`\n\x1b[0;92mWARNING\x1b[0m Unauthenticated WebSocket from '${requestip}' connection rejected`)
              return
            }
          }

          logger.info(`\nWebSocket connection from page ${ws.page}`)

          ws.on("error", logger.error)

          ws.on("message", (payload: any) => {
            // update time
            ws.connectTime = Date.now()
          })

          ws.on("close", () => {
            let requestip = "::1" ? "127.0.0.1" : req.socket.remoteAddress.replace(/^.*:/, "")
            if (config.__web_auth__ && sessionmgr.sessions.hasOwnProperty(requestip))
              delete sessionmgr.sessions[requestip]
          })
          
          message["PACKETS"] = { TRAFFIC: this.postProd(this.clients) }

          ws.send(JSON.stringify({ CONFIG: message }))

          // console.log(this.lineIndex.toString().padStart(5, '0'))
        })

        try {
          let hostServer: string = config.__monitor_webserver_ip__
          this.webServer = http.createServer(this.requestListener)
          this.webServer.listen(config.__monitor_webserver_port__, hostServer, () => {
            logger.info(`\nWeb server is running on ${hostServer}:${config.__monitor_webserver_port__}`)
          })
        }
        catch(e) {
          logger.info(`Error in webserver creation: ${e.toString()}`) 
        }
      }
      catch(e) {
        logger.info(`Error creating WebSocketServer: ${e.toString()}`)
      }    
      
      setInterval(() => {
        this.updateDashboard()
      }, 500)
    })
  }
}

new Monitor().init()
