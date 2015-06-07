/// <reference path="../scripts/typings/angularjs/angular-cookies.d.ts" />
/// <reference path="toastr.module.ts" />
/// <reference path="../scripts/typings/jquery/jquery.d.ts" />
/// <reference path="../scripts/typings/toastr/toastr.d.ts" />
/// <reference path="../scripts/typings/angularjs/angular.d.ts" />
module post {
    export interface IPostController {
        states: Array<PostModel>;
        options: PostOptions;
        addState($event): void;
        hasStates(): boolean;
        isSystemDisabled(): boolean;
    }

    class PostOptions {
        isFirstOpen: boolean;
        isSecondOpen: boolean;
    }

    enum SystemState {
        Start, Stop, Pause
    }

    class PostController implements IPostController {
        states = new Array<PostModel>();
        options = {
            isFirstOpen: true,
            isSecondOpen: false,
            showValidationErrors: true,
            stateSplitter: "*",
            playSpeed: 4,
            playMinSpeed: 1,
            playStep: 1,
            playMaxSpeed: 10
        }
        system = {
            state: SystemState.Stop,
            steps: new Array<PostModel>(),
            playInterval: -1,
        };
        templates = {
            "Maszyna akceptująca słowa kończące się na a dla słowa ab": '[{"to":"B0*a*b*B1*","from":"B0","isStarting":true},{"from":"*B1*a","to":"B1*"},{"from":"*B1*b","to":"B2*"},{"from":"*B1*#","to":"B1*"},{"from":"*B1*e","isEnd":true,"to":"B3"},{"from":"*B2","to":"b*B1*"},{"from":"*a","to":"a*"},{"from":"*b","to":"b*"},{"from":"*#","to":"#*"}]'
        }

        public static $inject = ['$scope', '$cookies', 'ngToastr'];
        constructor(private $scope: ng.IScope, private $cookies: angular.cookies.ICookiesService, private toastr: ngToastr.IToastrService) {
            $scope.$watch(() => { return this.options.playSpeed; }, (oldVal, newVal) => {
                if (oldVal != newVal && this.isSystemStart()) {
                    this.systemPause();
                    this.systemPlay();
                }
            });
            this.restoreStatesFromCookie();
            $scope.$watch(() => { return this.states; }, (oldVal, newVal) => {
                if (oldVal != newVal && oldVal.length != newVal.length) {
                    this.saveStatesToCookie();
                }
            });
        }

        restoreStatesFromCookie = () => {
            var states = <Array<PostModel>>this.$cookies.getObject("states");
            if (!!states && states.length > 0) {
                this.states = states;
            }
        }

        saveStatesToCookie = () => {
            this.$cookies.putObject("states", this.states);
        }

        loadTemplate = (templateJsonStr: string) => {
            this.systemStop();
            var states = $.parseJSON(templateJsonStr);
            this.states = states;
        }

        addState = ($event) => {
            this.stopEvent($event);
            this.states.push(<PostModel> {});
        }

        removeState = (state: PostModel) => {
            this.states.splice(this.getStateIndex(state), 1);
        }

        getStateIndex = (state: PostModel) => {
            return this.states.indexOf(state);
        }

        setStartingState = (state: PostModel) => {
            angular.forEach(this.states, (st) => {
                st.isStarting = false;
            });
            state.isStarting = true;
        }

        hasStates = () => {
            return !!this.states && this.states.length > 0;
        }

        isSystemDisabled = () => {
            return !this.hasStates();
        }

        isSystemStart = () => {
            return this.system.state == SystemState.Start;
        }

        systemToggle = () => {
            if (this.system.state == SystemState.Start) {
                this.systemPause();
            } else {
                this.systemPlay();
            }
        }

        systemStop = () => {
            this.system.state = SystemState.Stop;
            clearInterval(this.system.playInterval);
            this.system.steps.splice(0, this.system.steps.length);
        }

        systemPause = () => {
            this.system.state = SystemState.Pause;
            clearInterval(this.system.playInterval);
        }

        systemPlay = () => {
            this.system.state = SystemState.Start;
            this.system.playInterval = setInterval(() => {
                this.systemNext();
                var phase = this.$scope.$$phase;
                if (phase !== '$apply' || phase !== '$digest')
                    this.$scope.$apply();
            }, this.options.playSpeed * 150);
        }

        systemNext = () => {
            if (!this.hasStates()) {
                this.toastr.getToastr().error("Brak przejść");
                this.systemStop();
                return;
            }

            if (this.system.steps.length == 0) {
                var startState = this.getStartState();
                if (!startState) {
                    this.toastr.getToastr().error("Brak początkowego przejścia");
                    this.systemStop();
                    return;
                }
                this.system.steps.push(startState);
            } else {
                var from = this.getStepSplittedArray(true);
                var to = this.getStepSplittedArray(false);
                var matchedStates = [];
                if (from.length > to.length) {
                    var toFind = from.slice(to.length).join("");
                    matchedStates = this.getStateMatched(toFind, false);
                } else {
                    var toFind = to.slice(from.length).join("");
                    matchedStates = this.getStateMatched(toFind, true);
                }
                if (!matchedStates || matchedStates.length == 0) {
                    this.toastr.getToastr().error("Brak przejścia do wykorzystania. Maszyna się zatrzymuje i odrzuca słowo");
                    return;
                }

                if (matchedStates.length > 1) {
                    this.toastr.getToastr().warning("Wiecej niż jedno przejscie do wyboru. Maszyna wybiera pierwsze.");
                }
                this.system.steps.push(matchedStates[0]);
            }
            this.systemDetectLoop();
        }

        systemDetectLoop = () => {
            var stepNumbers = this.getStepIdArray();
            var stepNumersStr = stepNumbers.join("");
            var subsets = this.getSubsets(stepNumbers);
            for (var i = 0; i < subsets.length; i++) {
                var subset = subsets[i];
                if (subset.length > 1) {
                    var subsetStr = subsets[i].join("");
                    var indices = this.getIndicesOf(subsetStr, stepNumersStr, false);
                    if (indices.length > 1) {
                        var subStr = subsetStr.repeat(indices.length);
                        if (stepNumersStr.indexOf(subStr) == stepNumersStr.length - subStr.length) { //ends by lopp
                            this.systemPause();
                            this.toastr.getToastr().warning("Wykryto pętlę [" + subsets[i].join(",")+"]. System został zatrzymany");
                            return;
                        }
                    }
                }
            }
        }

        getStateMatched = (match: string, matchInFrom: boolean) => {
            var matched = [];
            angular.forEach(this.states, (state) => {
                if (matchInFrom) {
                    if (match.indexOf(state.from) == 0) {
                        matched.push(state);
                    }
                } else {
                    if (match.indexOf(state.to) == 0) {
                        matched.push(state);
                    }
                }
            });
            return matched;
        }

        private getStartState = () => {
            var startState = null;
            angular.forEach(this.states, (state) => {
                if (state.isStarting) {
                    startState = state;
                    return false;
                }
            });
            return startState;
        }

        getStepSplittedArray = (getFrom: boolean) => {
            var array = [];
            angular.forEach(this.system.steps, (state) => {
                var toSplit = getFrom ? state.from : state.to;
                array = array.concat(this.splitState(toSplit));
            });
            return array;
        }

        getStepIdArray = () => {
            var array = [];
            angular.forEach(this.system.steps, (state) => {
                array.push(this.getStateIndex(state)+1);
            });
            return array;
        }

        splitState = (toSplit: string) => {
            var array = Array<string>();
            var tmp = "";
            angular.forEach(toSplit, (s) => {
                if (s === this.options.stateSplitter) {
                    if (tmp !== "")
                        array.push(tmp);
                    array.push(this.options.stateSplitter);
                    tmp = "";
                } else {
                    tmp += s;
                }
            });
            if (tmp !== "")
                array.push(tmp);
            return array;
        }

        getStepFromColspan = (state: PostModel) => {
            return this.splitState(state.from).length;
        }
        getStepToColspan = (state: PostModel) => {
            return this.splitState(state.to).length;
        }


        stopEvent = ($event) => {
            $event.preventDefault();
            $event.stopPropagation();
        }

        getSubsets = function (a) {
            var fn = function (n, src, got, all) {
                if (n == 0) {
                    if (got.length > 0) {
                        all[all.length] = got;
                    }
                    return;
                }
                for (var j = 0; j < src.length; j++) {
                    fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
                }
                return;
            }
            var all = [];
            for (var i = 0; i < a.length; i++) {
                fn(i, a, [], all);
            }
            all.push(a);
            return all;
        }

        getIndicesOf(searchStr, str, caseSensitive) {
            var startIndex = 0, searchStrLen = searchStr.length;
            var index, indices = [];
            if (!caseSensitive) {
                str = str.toLowerCase();
                searchStr = searchStr.toLowerCase();
            }
            while ((index = str.indexOf(searchStr, startIndex)) > -1) {
                indices.push(index);
                startIndex = index + searchStrLen;
            }
            return indices;
        }
    }


    angular.module("post")
        .controller("post.PostController", PostController);
} 