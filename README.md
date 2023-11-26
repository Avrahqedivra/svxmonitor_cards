# svxmonitor cards
** svxmonitor v2 is a NODEJS dashboard for SVXLink **
    
    - almost not templated, easily editable

    Prerequisites:

    - nodejs    (as recent as possible not less than v18)
    - npm       (as recent as possible matches nodejs)

    must be installed 
    
    cd /opt
    git clone https://github.com/Avrahqedivra/svxmonitor_cards.git
    cd svxmonitor_cards

    to install needed packages : 
    
        npm install
    
    then make a config.ts file
        
        cd src
        cp config_sample.txt config.ts

    edit an adjust the port, ip address to match your server requirements: 

        edit config.ts      (use an UTF-8 capable editor, vscode or notepad++ for exemple)
    
    build the transpiled files with: 
        
        return to the svxmonitor_cards main folder

        npm run build

    after build test with: 
    
        node ./dist/monitor.js
    
    test with your browser on: 
        
        http://monitorip:port


    /**
    * gencode utility (crc16 based)
    */
    if you decide to make your dashbaord private with a password, you'll need to: 

        - set config.__web_auth__ to true
        - set config.__web_secret_key__ to "a new secret key"
        - use gencode to compute a password from your login string

    After the secret key has been set just do:

        node ./dist/gencode.ts mylogin <enter>

    if everyhting is ok, you'll get a string of 4 or 5 digits that will be your password (nothing is stored anywhere)
    
