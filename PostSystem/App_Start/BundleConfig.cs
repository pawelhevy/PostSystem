using System.Web;
using System.Web.Optimization;

namespace PostSystem
{
    public class BundleConfig
    {
        // For more information on Bundling, visit http://go.microsoft.com/fwlink/?LinkId=254725
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js",
                        "~/Scripts/bootstrap.js",
                        "~/Scripts/bootstrap-slider.js",
                        "~/Scripts/toastr.js"
                        ));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.unobtrusive*",
                        "~/Scripts/jquery.validate*"));

            bundles.Add(new ScriptBundle("~/bundles/angular").Include(
                        "~/Scripts/angular/angular.js",
                        "~/Scripts/angular/angular-cookies.js",
                        "~/Scripts/angular/angular-animate.js",
                        "~/Scripts/angular-ui/ui-bootstrap.js",
                        "~/Scripts/angular-ui/ui-bootstrap-tpls.js",
                        "~/Scripts/angular-ui/ui-slider.js"
                        ));

            bundles.Add(new ScriptBundle("~/bundles/angularPostSystemModule").Include(
                        "~/app/toastr.module.js",
                        "~/app/post.module.js",
                        "~/app/post.model.js",
                        "~/app/post.controller.js"
                        ));


            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                "~/Content/site.css",
                "~/Content/bootstrap.css",
                "~/Content/bootstrap-slider.css",
                "~/Content/toastr.css",
                "~/Content/postSystem.css"
                ));

        }
    }
}