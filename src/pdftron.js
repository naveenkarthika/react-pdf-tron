import React, { useRef, useEffect } from 'react';
import WebViewer from '@pdftron/webviewer';
import './App.css';
import { useLocation } from 'react-router-dom'
const CryptoJS = require("crypto-js");
const base64 = require('base-64');
const utf8 = require('utf8');



const PDFTron = () => {
    const viewer = useRef(null);
    const queryParams = new URLSearchParams(useLocation().search);
    const getParams = queryParams && queryParams.get('pdf_url');
    const fileExtension = getParams && getParams.match(/\.(pdf|doc|docx|xlxs)$/i);
    console.log('getParams',getParams)

    // let url = `https://esquiretek-private-asset-staging.s3-accelerate.amazonaws.com/DefSROGS1toPlt0927211_3S3LIBLT.pdf?AWSAccessKeyId=ASIA37ZFJDY4LRBEGHE7&Expires=1641491917&Signature=a2AcadHaMJSadXCyncFMmYcBo0I%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEKH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJGMEQCIGPt8wvDMVJZabYigfHNyw2dCPqhAabivwckRou1upciAiA%2F75reIbZJ220ltjwMJr5Hl34z8PpDcObZ7ZOm2eN41CqhAgiq%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDgyNDE3NTA0MjEwNCIMJjNdDnJE0BSpvqiTKvUBIfiFVyKYd5fTc2FhTaaq5LuQ%2BD7r9Wuzk5Wjg89Zj7zIpCR5vy1snpG0Lm5TGsHadzoxkoaHuFo%2Fa6nca4og8u6KKNIGuqXkn9a1T7AdP8aVxk0iTUv4zTXwvsDqPDZrLE5kXVS4BzkIsfT5mwwv0txNzOYPRd4sHOBGyjWBoYqgIpnOOiTW6pVOj7Y2mySMv16o8L10fsqMtBnE3XOZKfru0qmGQhEmje6rhSC1aeWG%2BNYmGmKbHV%2FOjwOmn%2FCCMmGCY9y8CUfXl3Xc4pkgb3FNPdHn7jCkzJ56ozYPCFYb7NhqDjNgrOSvc7RgNoOgiKGgfI8w47ncjgY6mwGA1TUzbGHxKiSRZqovW72X1w0znaPH9H4gwKwboIoVuYvuJa7yCsywOjWpLk5ZdJ7F%2BIUoiJdBhGhkORkdoBZ8jBP94B9DV8KjmgRgp76PYCanqP1DGrhUcDYA%2BqbvKvlVmI3AMyMZ09WDodi6eTn7uqHWgpX10BGsk1cV221F%2FZj5tUxK%2BSwuS8H0B4Zq0CfhQIATP5XqrDKHsw%3D%3D`

    //Decrypt
    // const secret = '346FGDSwtewetwetHYF';
    // const decodedUrl =  CryptoJS.AES.decrypt(secret, getParams);
    // const originalUrl = decodedUrl.toString(CryptoJS.enc.Utf8);

    // base 64 decoded
    var bytes = base64.decode(getParams);
    var text = utf8.decode(bytes);

    console.log('text',text)


    // if(url){
    //     var ciphertext = CryptoJS.AES.encrypt(secret, url).toString();
    //     console.log('ciphertext',ciphertext)
    //     var decoded =  CryptoJS.AES.decrypt(secret, ciphertext);
    //     var originalText  = decoded && decoded.toString(CryptoJS.enc.Utf8);
    //     console.log('original',originalText )
    // }

    
    useEffect(() => {
        WebViewer({
            path: "/webviewer/lib/",
            initialDoc: text,
            fullAPI: true,
            disableLogs: true,
            useDownloader: false
        },
            viewer.current,
        ).then(instance => {
            if (!getParams) {
                instance.showErrorMessage('PDF url required in url params');
            } else if (!fileExtension) {
                instance.showErrorMessage('Please provide valid pdf url');
            } else {
                instance.UI.disableElements(['toolbarGroup-Shapes']);
                instance.UI.disableElements(['toolbarGroup-View']);
                instance.UI.disableElements(['toolbarGroup-Annotate']);
                instance.UI.disableElements(['toolbarGroup-FillAndSign']);
                instance.UI.disableElements(['toolbarGroup-Forms']);
                instance.UI.disableElements(['toolbarGroup-Insert']);
                instance.UI.disableElements(['toggleNotesButton', 'menuButton', 'leftPanelButton', 'viewControlsButton', 'selectToolButton', 'panToolButton', 'eraserToolButton', 'cropToolGroupButton', 'toolsHeader', 'toolbarGroup-Edit', 'redoButton', 'undoButton']);
                instance.setToolMode('CropPage');

                const { documentViewer, annotationManager, Tools, PDFNet } = instance.Core;

                var FitMode = instance.FitMode;
                instance.setFitMode(FitMode.FitWidth);

                const extractText = async (doc, pageNumber, top_x, top_y, bottom_x, bottom_y) => {
                    const pageText = await doc.loadPageText(pageNumber);
                    var textPosition = await doc.getTextPosition(pageNumber, 0, pageText.length);
                    var indexes = []
                    if (pageText && pageText !== '' && textPosition) {

                        textPosition.filter((item, index) => {
                            if (item.x4 >= top_x && item.y4 >= top_y && item.x2 <= bottom_x && item.y2 <= bottom_y) {
                                indexes.push(index)
                                return true;
                            }
                            return false;
                        });
                        let str = '';
                        for (let i = 0, len = indexes.length; i < len; i++) {
                            str += pageText[indexes[i]];
                        }
                        return str;
                    } else {
                        return false;
                    }
                }

                Tools.CropCreateTool.prototype.applyCrop = async function (e) {
                    await PDFNet.initialize();
                    const annotation = annotationManager.getAnnotationsList().find(annotation => annotation.ToolName === "CropPage");
                    const cropRect = annotation.getRect();
                    const doc = documentViewer.getDocument();
                    const pageNumber = annotation.getPageNumber();

                    documentViewer.getDocument().loadCanvasAsync({
                        pageNumber: annotation.PageNumber,
                        renderRect: cropRect,
                        drawComplete: async (canvas, index) => {
                            var extractedText = await extractText(doc, pageNumber, cropRect.x1, cropRect.y1, cropRect.x2, cropRect.y2);
                            let obj;
                            if (extractedText && extractedText !== '' && typeof extractedText === 'string') {
                                obj = Object.assign({}, {
                                    id: Math.random(),
                                    extarctText: extractedText,
                                    cropImage: canvas.toDataURL()
                                });
                            } else {
                                obj = Object.assign({}, {
                                    id: Math.random(),
                                    extarctText: '',
                                    cropImage: canvas.toDataURL()
                                });
                            }
                            window.parent.postMessage(obj, "*");
                            console.log('Child IFrame', obj);
                        }
                    });
                    annotationManager.deleteAnnotation(annotation);               
                };
            }
        }).catch((error) => {
            console.log('Catch Exception', error);
        });
    }, []);

    return (
        <div className="App">
            <div className="webviewer" ref={viewer}></div>
        </div>
    );
};

export default PDFTron;
