/**
 * The web build has no barcode reader (expo-camera only decodes QR codes in
 * browsers): search by name or type the digits instead. Keeping this stub
 * also avoids loading the camera module on web.
 */
export function BarcodeScanner(_: {
  onCode: (code: string) => void;
  onClose: () => void;
  status: { busy?: boolean; message?: string };
}) {
  return null;
}
