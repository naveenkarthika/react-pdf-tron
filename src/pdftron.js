import React, { useRef, useEffect } from 'react';
import WebViewer from '@pdftron/webviewer';
import './App.css';
import { useLocation } from 'react-router-dom'
const CryptoJS = require("crypto-js");


const PDFTron = () => {
    const viewer = useRef(null);
    const queryParams = new URLSearchParams(useLocation().search);
    const getParams = queryParams && queryParams.get('pdf_url');
    const fileExtension = getParams && getParams.match(/\.(pdf|doc|docx|xlxs)$/i);
    console.log('getParams',getParams)
    //Decrypt
    const secret = '346FGDS$#@*HYF';
    const decodedUrl =  CryptoJS.AES.decrypt(secret, getParams);
    const originalUrl = decodedUrl.toString(CryptoJS.enc.Utf8);
    console.log('originalUrl',originalUrl)
    useEffect(() => {
        WebViewer({
            path: "/webviewer/lib/",
            initialDoc: `${originalUrl}`,
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
