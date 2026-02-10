const { CompositeDisposable } = require("atom");

module.exports = {

  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-find-references.threshold", (value) => {
        this.threshold = value;
      }),
    );
    atom.config.set('pulsar-find-references.scrollbarDecoration.enable', false);
  },

  deactivate() {
    this.disposables.dispose();
  },

  getMarkerLayer(editor) {
    const byLayer = editor.decorationManager?.layerDecorationsByMarkerLayer;
    if (!byLayer) return null;
    for (const [markerLayer, decorations] of byLayer) {
      for (const decoration of decorations) {
        if (decoration?.properties?.class === 'pulsar-find-references-reference') {
          return markerLayer;
        }
      }
    }
    return null;
  },

  provideScrollmap() {
    return {
      name: "find-refs",
      description: "Find-references markers",
      timer: 50,
      initialize: ({ editor, cache, disposables, update }) => {
        const subscribe = (layer) => {
          if (cache.get('layer')) return;
          cache.set('layer', layer);
          disposables.add(layer.onDidUpdate(update));
          update();
        };
        const existing = this.getMarkerLayer(editor);
        if (existing) {
          subscribe(existing);
        } else {
          const orig = editor.decorateMarkerLayer;
          editor.decorateMarkerLayer = function(layer, params) {
            const result = orig.call(this, layer, params);
            if (params?.class === 'pulsar-find-references-reference') {
              subscribe(layer);
            }
            return result;
          };
          disposables.add({ dispose: () => { editor.decorateMarkerLayer = orig; } });
        }
        disposables.add(
          atom.config.onDidChange("scrollmap-find-references.threshold", update),
        );
      },
      getItems: ({ cache }) => {
        const layer = cache.get('layer');
        if (!layer) return [];
        const markers = layer.getMarkers();
        const items = markers.map((marker) => ({
          row: marker.getStartScreenPosition().row,
        }));
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};
