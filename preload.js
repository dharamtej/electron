// preload.js
const { contextBridge, ipcRenderer } = require('electron');
 


contextBridge.exposeInMainWorld('electronAPI', {
   print: (printerName, copies) => {
     console.log("printer Name " , printerName,"Copies", copies);
    // ipcRenderer.send('print',  { printerName, copies })

     for (let i = 0; i < Number(copies); i++) 
         { 
             ipcRenderer.send('print',  { printerName })
             //win.webContents.print({ silent: true, deviceName: 'My_Printer' }); 
         }
 },
//  // Expose homedir from Node's os module
   homedir:"Method Called  and Home DIR", 
    printHtmlContent: (htmlString,printername) => { 
        console.log(" from preload method before :  htmlString" + htmlString + " printername  " +printername );
        ipcRenderer.send('print-html-content', htmlString,printername);
        console.log(" from preload method called :  htmlString" + htmlString + " printername  " +printername );

     },
    printBytes: (bytes,printername) => { 
          console.log(" from preload method before :  printername  " +printername );
     
        ipcRenderer.send('print-bytes', bytes,printername); 
      console.log(" from preload method after :  printername  " +printername );
     
    }

});

