import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class GarminWatchFaceApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
    }

    function onStop(state as Dictionary?) as Void {
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [ new GarminWatchFaceView() ];
    }
}

function getApp() as GarminWatchFaceApp {
    return Application.getApp() as GarminWatchFaceApp;
}
