(function (scope) {
  'use strict';
  async function build(words) {
    var Constructor = scope.PptxGenJS || scope.pptxgen;
    if (!Constructor || !scope.JSZip) throw new Error('PowerPoint library did not load. Reload the CVC page.');
    var deck = new Constructor();
    deck.layout = 'LAYOUT_WIDE';
    deck.author = 'RiverReader2';
    deck.subject = 'Teacher pretaught words';
    deck.title = 'Pretaught words';
    deck.lang = 'en-CA';
    deck.theme = {headFontFace:'Andika', bodyFontFace:'Andika', lang:'en-CA'};
    words.forEach(function (word) {
      var slide = deck.addSlide();
      slide.background = {color:'FFFFFF'};
      slide.addText(word, {x:0.5, y:2.75, w:12.333, h:2, fontFace:'Andika', fontSize:24, color:'000000', align:'center', valign:'mid', margin:0, breakLine:false});
    });
    var bytes = await deck.write({outputType:'uint8array'});
    var zip = await scope.JSZip.loadAsync(bytes);
    var types = await zip.file('[Content_Types].xml').async('string');
    zip.file('[Content_Types].xml', types.replace('application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml', 'application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml'));
    return zip.generateAsync({type:'uint8array', compression:'DEFLATE'});
  }
  scope.RIVER_WORD_SLIDES = {build:build};
}(typeof window === 'undefined' ? globalThis : window));
