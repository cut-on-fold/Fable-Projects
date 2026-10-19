// Printing to a Niimbot over Web Bluetooth with NiimBlueLib. Chrome and Edge
// have Web Bluetooth on a Mac, Windows and Android; Safari and Firefox do
// not, and then the PNG downloads are the way to the Niimbot app.

import { ImageEncoder, LabelType, NiimbotBluetoothClient, PageColorType, type PrintTaskName } from '@mmote/niimbluelib';

export function bluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export interface PrintJob {
  canvases: HTMLCanvasElement[];
  /** 1 (light) to 5 (dark). */
  density: number;
  copies: number;
  onProgress: (message: string) => void;
}

/** Connect (the browser asks which printer), print every canvas `copies` times, disconnect. */
export async function printToNiimbot(job: PrintJob): Promise<void> {
  if (!bluetoothAvailable()) throw new Error('This browser has no Web Bluetooth. Use Chrome or Edge, or download the images for the Niimbot app.');
  if (!job.canvases.length) throw new Error('Nothing to print.');
  const client = new NiimbotBluetoothClient();
  client.on('printprogress', (e) => job.onProgress(`Label ${e.page} of ${e.pagesTotal}: printing ${e.pagePrintProgress}%, feeding ${e.pageFeedProgress}%`));
  job.onProgress('Choose the printer in the browser’s list…');
  await client.connect();
  try {
    const meta = client.getModelMetadata();
    const head = meta?.printheadPixels ?? 384;
    const wide = job.canvases.find((c) => c.width > head);
    if (wide) throw new Error(`A label is ${wide.width} dots wide but this printer’s head is ${head}. Choose a narrower label.`);
    const taskName: PrintTaskName = client.getPrintTaskType() ?? 'B21_V1';
    job.onProgress(`Connected to ${meta?.model ?? 'the printer'}; sending ${job.canvases.length} label${job.canvases.length === 1 ? '' : 's'}…`);
    const total = job.canvases.length * job.copies;
    const task = client.protocol.newPrintTask(taskName, {
      totalPages: total,
      density: job.density,
      labelType: LabelType.WithGaps,
      statusPollIntervalMs: 100,
      statusTimeoutMs: 8000,
    });
    try {
      await task.printInit();
      for (const canvas of job.canvases) {
        const encoded = ImageEncoder.encodeCanvas(canvas, PageColorType.SingleColor, 'top');
        await task.printPage(encoded, job.copies);
        await task.waitForPageFinished();
      }
      await task.waitForFinished();
      job.onProgress(`Printed ${total} label${total === 1 ? '' : 's'}.`);
    } finally {
      await task.printEnd().catch(() => undefined);
    }
  } finally {
    await client.disconnect().catch(() => undefined);
  }
}
