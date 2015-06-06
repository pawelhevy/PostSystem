/// <reference path="../scripts/typings/jquery/jquery.d.ts" />
/// <reference path="../scripts/typings/toastr/toastr.d.ts" />
/// <reference path="../scripts/typings/angularjs/angular.d.ts" />

module ngToastr {
    export interface  IToastrService {
        getToastr() : Toastr;
    }

    class ToastrService implements IToastrService {
        getToastr = () => {
            return <Toastr> window["toastr"];
        }
    }

    angular.module("ngToastr", []).service("ngToastr", ToastrService);
} 