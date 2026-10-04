using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading.Tasks;
using Windows.Services.Store;

internal static class StoreUpdateHelper
{
    [ComImport]
    [Guid("3E68D4BD-7135-4D10-8018-9FB6D9F33FA1")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IInitializeWithWindow
    {
        void Initialize(IntPtr hwnd);
    }

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length < 2) throw new ArgumentException("Expected a command and the owning window handle.");
            var hwnd = new IntPtr(Convert.ToInt64(args[1], 16));
            var context = StoreContext.GetDefault();
            ((IInitializeWithWindow)(object)context).Initialize(hwnd);

            if (args[0] == "check") return CheckAndDownload(context).GetAwaiter().GetResult();
            if (args[0] == "install") return Install(context).GetAwaiter().GetResult();
            throw new ArgumentException("Unknown Store update command.");
        }
        catch (Exception error)
        {
            Emit("ERROR\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes(error.Message)));
            return 1;
        }
    }

    private static async Task<int> CheckAndDownload(StoreContext context)
    {
        IReadOnlyList<StorePackageUpdate> updates =
            await context.GetAppAndOptionalStorePackageUpdatesAsync().AsTask().ConfigureAwait(false);
        if (updates.Count == 0)
        {
            Emit("NO_UPDATES");
            return 0;
        }

        Emit("AVAILABLE\t" + updates.Count);
        var progress = new Progress<StorePackageUpdateStatus>(status =>
            Emit("PROGRESS\t" + Math.Max(0, Math.Min(100, (int)Math.Round(status.PackageDownloadProgress * 100)))));
        StorePackageUpdateResult result = await context.RequestDownloadStorePackageUpdatesAsync(updates)
            .AsTask(progress).ConfigureAwait(false);
        if (result.OverallState == StorePackageUpdateState.Completed)
        {
            Emit("READY");
            return 0;
        }

        Emit("ERROR\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes("The Store did not complete the update download (" + result.OverallState + ").")));
        return 1;
    }

    private static async Task<int> Install(StoreContext context)
    {
        IReadOnlyList<StorePackageUpdate> updates =
            await context.GetAppAndOptionalStorePackageUpdatesAsync().AsTask().ConfigureAwait(false);
        if (updates.Count == 0)
        {
            Emit("INSTALLED");
            return 0;
        }

        Emit("INSTALLING");
        StorePackageUpdateResult result = await context.RequestDownloadAndInstallStorePackageUpdatesAsync(updates)
            .AsTask().ConfigureAwait(false);
        if (result.OverallState == StorePackageUpdateState.Completed)
        {
            Emit("INSTALLED");
            return 0;
        }

        Emit("ERROR\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes("The Store did not complete the update installation (" + result.OverallState + ").")));
        return 1;
    }

    private static void Emit(string message)
    {
        Console.WriteLine(message);
        Console.Out.Flush();
    }
}
