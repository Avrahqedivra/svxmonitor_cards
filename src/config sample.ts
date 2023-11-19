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

export const __system_name__: string            = "SVX Monitor Cards for SVXLINK"   // Name of the monitored SVXLink system

export const __frequency__: number              = 500               // Frequency to push ctable updates to web clients
export const __monitor_webserver_ip__: string   = '0.0.0.0'        // WiresX server address
export const __monitor_webserver_port__: number = 7779              // Has to be above 1024 if you're not running as root
export const __socketServerPort__: number       = 9004              // Websocket server for realtime monitoring


export const __displayLines__: number           = 10                // number of lines displayed in index_template
export const __client_timeout__: number         = 0                 // Clients are timed out after this many seconds, 0 to disable

export const __loginfo__: boolean               = false                                       // more log

// how long the sitelogo should appear for the dashboard page in milliseconds
export const __bannerDelay__: number            = 0

// sets default theme (dark or light)
export const __theme__: string                  = "dark_theme"

// allowed socket direct accesses (by default here, only from local machine, any page id, infinite lease, all tg)
export const __allowed__socket_clients__: any[] = [
  { ipaddress: "127.0.0.1", id:"*", lease: "*", tglist: [] },
  { ipaddress: "145.224.88.24", id:"flux", lease: "365", tglist: ['20899'] }
]

// hide partial parts of ip address
export const hide_hotspot_ip: boolean = false

// Authorization of access to dashboard as admin
// use http://mysite:port?admin to log as admin
export const admin_user__: string       = 'admin'

// Authorization of access to dashboard# as user
export const __web_auth__: boolean      =  false

// secret salt key for passcode generator
export const __web_secret_key__: string = "SECRETKEY"

// Max lines in lastactive table (0 means all TGs defined in TG_ORDER list)
export const __last_active_size__: number       = 0

// Lastheard file size
export const __lastheard_size__: number         = 2000

// Nb lines in first packet sent to dashboard
export const __traffic_size__: number           = 500

// Nb of days of traffic should be seen on the dashbaord, 0 for all
export const __traffic_last_N_days__: number    = 0
// Display percent
export const __displayPercent__: boolean        = true

// Files and stuff for loading alias files for mapping numbers to names
export const __path__: string            = './'                           // MUST END IN '/'
export const FILE_RELOAD: number     = 1                              // Number of days before we reload DMR-MARC database files

export const __siteLogo__: string               = 'sitelogo.html'
export const __buttonBar__: string              = 'buttonbar.html'
export const __footer__: string                 = 'footer.html'

// Settings for log files
export const __log_path__: string               = './log/'                       // MUST END IN '/'
export const __log_name__: string               = 'svxreflector.log'

export const __file_reload__: number            = 7                              // Number of days before we reload Radio-ID database files
export const __subscriber_url__: string         = 'https://database.radioid.net/static/users.json'
export const __subscriber_file__: string        = 'subscriber_ids.json'          // Will auto-download from DMR-MARC
