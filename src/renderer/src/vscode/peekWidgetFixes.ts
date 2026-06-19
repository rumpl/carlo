import { ReferenceWidget } from '@codingame/monaco-vscode-api/vscode/vs/editor/contrib/gotoSymbol/browser/peek/referencesWidget';

const previewRatio = 0.7;
let installed = false;

interface PatchedReferenceWidget {
  layoutData: { ratio: number };
  _dim?: { width?: number };
  _splitView?: { resizeView(index: number, size: number): void };
}

function enforcePreviewRatio(widget: ReferenceWidget): void {
  const instance = widget as unknown as PatchedReferenceWidget;
  const width = instance._dim?.width;
  if (!width || !instance._splitView) return;

  instance.layoutData.ratio = previewRatio;
  instance._splitView.resizeView(0, width * previewRatio);
}

function enforcePreviewRatioSoon(widget: ReferenceWidget): void {
  enforcePreviewRatio(widget);
  requestAnimationFrame(() => enforcePreviewRatio(widget));
  setTimeout(() => enforcePreviewRatio(widget), 50);
  setTimeout(() => enforcePreviewRatio(widget), 250);
  setTimeout(() => enforcePreviewRatio(widget), 1000);
}

export function installPeekWidgetFixes(): void {
  if (installed) return;
  installed = true;

  const prototype = ReferenceWidget.prototype as unknown as {
    _doLayoutBody(heightInPixel: number, widthInPixel: number): void;
    setModel: ReferenceWidget['setModel'];
    setSelection: ReferenceWidget['setSelection'];
  };

  const originalDoLayoutBody = prototype._doLayoutBody;
  prototype._doLayoutBody = function patchedDoLayoutBody(
    this: ReferenceWidget,
    heightInPixel: number,
    widthInPixel: number,
  ) {
    this.layoutData.ratio = previewRatio;
    originalDoLayoutBody.call(this, heightInPixel, widthInPixel);
    enforcePreviewRatioSoon(this);
  };

  const originalSetModel = prototype.setModel;
  prototype.setModel = function patchedSetModel(
    this: ReferenceWidget,
    ...args: Parameters<ReferenceWidget['setModel']>
  ) {
    const result = originalSetModel.apply(this, args);
    result.finally(() => enforcePreviewRatioSoon(this));
    return result;
  };

  const originalSetSelection = prototype.setSelection;
  prototype.setSelection = function patchedSetSelection(
    this: ReferenceWidget,
    ...args: Parameters<ReferenceWidget['setSelection']>
  ) {
    const result = originalSetSelection.apply(this, args);
    result.finally(() => enforcePreviewRatioSoon(this));
    return result;
  };
}
