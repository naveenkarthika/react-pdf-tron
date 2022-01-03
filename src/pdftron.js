import React, { useRef, useEffect, useState } from 'react';
import WebViewer from '@pdftron/webviewer';
import './App.css';

const App = () => {
    const viewer = useRef(null);
    const [text, setText] = useState(false);
    const [imageURL, setImageURL] = useState(false);
    const pdfDoc = window.location.href;
    const queryParams = pdfDoc && new URL(pdfDoc).searchParams;
    const getParams = queryParams && queryParams.get('pdf_url');
    const fileExtension = getParams && getParams.lastIndexOf('.pdf') > -1;

    useEffect(() => {
        WebViewer({
            path: "/webviewer/lib/",
            initialDoc: "/files/FamilyLawFrogs_sample.pdf", //"https://esquiretek-library.s3.us-west-1.amazonaws.com/Unlawful-marked.pdf",
            fullAPI: true,
            disableLogs: true,
            useDownloader: false
        },
            viewer.current,
        ).then(instance => {
            // var iframeElement = document.getElementsByTagName("iframe")[0];
            var flagTXT = false; var scannedPDF = false;

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
                instance.UI.disableElements(['toggleNotesButton', 'menuButton', 'leftPanelButton', 'viewControlsButton', 'selectToolButton', 'panToolButton']);

                const { documentViewer, annotationManager, Tools, PDFNet } = instance.Core;

                instance.setToolMode('CropPage');
                instance.disableElements(['redoButton', 'undoButton']);

                var FitMode = instance.FitMode;
                instance.setFitMode(FitMode.FitWidth);

                PDFNet.initialize();

                documentViewer.addEventListener('documentLoaded', async () => {
                    const doc = instance.Core.documentViewer.getDocument();
                    const pdfDoc = await doc.getPDFDoc();
                    const totalPages = await pdfDoc.getPageCount();

                    for (var i = 1; i <= totalPages; i++) {
                        const text = await doc.loadPageText(i);
                        if (text && text != null) {
                            flagTXT = true;
                        } else {
                            scannedPDF = true;
                            const pdfdraw = await PDFNet.PDFDraw.create(92); //resolution per pages
                            const itr = await pdfDoc.getPageIterator(i);
                            const currPage = await itr.current();

                            const pngBuffer = await pdfdraw.exportBuffer(currPage, 'PNG');
                            const saveBlob = new Blob([pngBuffer.buffer], { type: 'image/png' });

                            const blobToBase64 = blob => {
                                const reader = new FileReader();
                                reader.readAsDataURL(blob);
                                return new Promise(resolve => {
                                    reader.onloadend = () => {
                                        resolve(reader.result);
                                    };
                                });
                            };

                            var dataUrl = await blobToBase64(saveBlob);
                        }
                    }
                })

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

                const applyCrop = Tools.CropCreateTool.prototype.applyCrop;

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
                                obj = JSON.parse(JSON.stringify({
                                    text: flagTXT,
                                    image: scannedPDF,
                                    extarctText: extractedText,
                                    cropImage: canvas.toDataURL()
                                }));
                            } else {
                                obj = JSON.parse(JSON.stringify({
                                    text: flagTXT,
                                    image: scannedPDF,
                                    extarctText: '',
                                    cropImage: canvas.toDataURL()
                                }));
                            }
                            window.parent.postMessage(obj, "*");
                            console.log('Object--', obj);
                            var image = new Image();
                            image.onload = function () {
                                image.src = obj.cropImage;
                                document.querySelector('#imageContainer').innerHTML = image.outerHTML;
                            }
                        }
                    });
                    applyCrop.apply(this, arguments);
                };
            }
        }).catch((error) => {
            console.log('Catch Exception', error);
        });

    }, []);

    return (
        <div className="App">
            <div className="webviewer" ref={viewer}></div>
            {/* <div id='imageContainer'></div> */}
        </div>
    );
};

export default App;
