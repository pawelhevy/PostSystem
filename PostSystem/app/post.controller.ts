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
    
    class Machine {
        isEnded: boolean;
        isSuccessful: boolean;
        steps: Array<PostModel>;

        constructor() {
            this.steps = new Array<PostModel>();
        }
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
            machines: new Array<Machine>(),
            playInterval: -1,
        };
        templates = {
            "Maszyna akceptująca słowa kończące się na a dla słowa ab": '[{"to":"B0*a*b*B1*","from":"B0","isStarting":true},{"from":"*B1*a","to":"B1*"},{"from":"*B1*b","to":"B2*"},{"from":"*B1*#","to":"B1*"},{"from":"*B1*e","isEnding":true,"to":"B3"},{"from":"*B2","to":"b*B1*"},{"from":"*a","to":"a*"},{"from":"*b","to":"b*"},{"from":"*#","to":"#*"}]',
            "Maszyna akceptująca słowa kończące się na a dla słowa a": '[{"to":"B0*a*B1*","from":"B0","isStarting":true},{"from":"*B1*a","to":"B1*"},{"from":"*B1*b","to":"B2*"},{"from":"*B1*#","to":"B1*"},{"from":"*B1*e","isEnding":true,"to":"B3"},{"from":"*B1*B3","isEnding":true,"to":"B3"},{"from":"*B2","to":"b*B1*"},{"from":"*a","to":"a*"},{"from":"*b","to":"b*"},{"from":"*#","to":"#*"}]',
            "Maszyna akceptująca słowa kończące się na a dla słowa aa": '[{"to":"B0*a*a*B1*","from":"B0","isStarting":true},{"from":"*B1*a","to":"B1*"},{"from":"*B1*b","to":"B2*"},{"from":"*B1*#","to":"B1*"},{"from":"*B1*e","isEnding":true,"to":"B3"},{"from":"*B1*B3","isEnding":true,"to":"B3"},{"from":"*B2","to":"b*B1*"},{"from":"*a","to":"a*"},{"from":"*b","to":"b*"},{"from":"*#","to":"#*"},{"from":"*a*B1","to":"B1*"}]'
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
                if (oldVal != newVal) {
                    this.saveStatesToCookie();
                }
            }, true);
        }

        //#region createPostModel
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
            this.systemStop();
            this.stopEvent($event);
            this.states.push(<PostModel> {});
        }

        removeState = (state: PostModel) => {
            this.systemStop();
            this.states.splice(this.getStateIndex(state), 1);
        }

        clearStates = ($event) => {
            this.systemStop();
            this.stopEvent($event);
            this.states = new Array<PostModel>();
        }

        getStateIndex = (state: PostModel) => {
            return this.states.indexOf(state);
        }

        setStartingState = (state: PostModel) => {
            this.systemStop();
            angular.forEach(this.states, (st) => {
                st.isStarting = false;
            });
            state.isStarting = true;
        }

        hasStates = () => {
            return !!this.states && this.states.length > 0;
        }
        //#endregion

        //#region engine
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
            this.system.machines.splice(0, this.system.machines.length);
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
            if (this.system.machines.length == 0) {
                this.system.machines.push(new Machine());
            }
            var allMachinesEnded = true;
            angular.forEach(this.system.machines, (machine) => {
                if (machine.isEnded)
                    return;
                allMachinesEnded = false;
                if (machine.steps.length == 0) {
                    var startState = this.getStartState();
                    if (!startState) {
                        this.toastr.getToastr().error("Brak początkowego przejścia");
                        this.systemStop();
                        return;
                    }
                    machine.steps.push(startState);
                } else {
                    var from = this.getStepSplittedArray(machine.steps, true);
                    var to = this.getStepSplittedArray(machine.steps, false);
                    var matchedStates = [];
                    if (from.length > to.length) {
                        var toFind = from.slice(to.length).join("");
                        matchedStates = this.getStateMatched(toFind, false);
                    } else {
                        var toFind = to.slice(from.length).join("");
                        matchedStates = this.getStateMatched(toFind, true);
                    }
                    if (!matchedStates || matchedStates.length == 0) {
                        this.systemPause();
                        this.toastr.getToastr().error("Brak przejścia do wykorzystania. Maszyna się zatrzymuje i odrzuca słowo");
                        return;
                    }
                    if (matchedStates.length > 1) {
                        for (var i = 1; i < matchedStates.length; i++) {
                            var newMachine = new Machine();
                            newMachine.steps = machine.steps.slice();
                            newMachine.steps.push(matchedStates[i]);
                            this.system.machines.push(newMachine);
                        }
                    }

                    machine.steps.push(matchedStates[0]);
                }
            });
            if (!allMachinesEnded) {
                this.systemDetectLoop();
            }
            this.systemCheckEnd();
        }

        systemCheckEnd = () => {
            var allStepEnded = true;
            angular.forEach(this.system.machines, (machine) => {
                if (machine.isEnded)
                    return;
                var lastStep = machine.steps[machine.steps.length - 1];
                if (!!lastStep && lastStep.isEnding) {
                    machine.isEnded = true;
                    machine.isSuccessful = true;
                } else {
                    allStepEnded = false;
                }
            });
            if (allStepEnded) {
                this.systemPause();
                this.toastr.getToastr().success("Maszyna dotarła do końca");
            }
        }

        systemDetectLoop = () => {
            var allStepsEndedOrLooping = true;
            angular.forEach(this.system.machines, (machine,machineId) => {
                if (machine.isEnded)
                    return;

                var stepNumbers = this.getStepIdArray(machine.steps);
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
                                //machine.isEnded = true;
                                //this.systemPause();
                                this.toastr.getToastr().warning("Wykryto pętlę [" + subsets[i].join(",") + "] w maszynie "+ (machineId+1));
                                return;
                            }
                        }
                    }
                }

                allStepsEndedOrLooping = false;
            });
            if (allStepsEndedOrLooping) {
                this.toastr.getToastr().warning("Wszystkie możliwe przejścia się zatrzymały bądź się pętlą. System został zatrzymany.");
                this.systemPause();
            }
        }

        getStateMatched = (match: string, matchInFrom: boolean) => {
            var matched = [];
            angular.forEach(this.states, (state) => {
                if (matchInFrom) {
                    if (match.indexOf(state.from) == 0 || (state.isEnding && state.from.indexOf(match) == 0 && state.from.substr(match.length) === state.to)) {
                    //if (match.indexOf(state.from) == 0 || state.from.indexOf(match) == 0) {
                        matched.push(state);
                    }
                } else {
                    //if (match.indexOf(state.to) == 0 || state.to.indexOf(match) == 0) {
                    if (match.indexOf(state.to) == 0) {
                        matched.push(state);
                    }
                }
            });
            return matched;
        }

        private getStartState = () :PostModel => {
            var startState = null;
            angular.forEach(this.states, (state) => {
                if (state.isStarting) {
                    startState = state;
                    return false;
                }
            });
            return startState;
        }

        getStepSplittedArray = (steps: Array<PostModel>, getFrom: boolean) => {
            var array = [];
            angular.forEach(steps, (state) => {
                var toSplit = getFrom ? state.from : state.to;
                array = array.concat(this.splitState(toSplit));
            });
            return array;
        }

        getStepIdArray = (steps: Array<PostModel>) => {
            var array = [];
            angular.forEach(steps, (state) => {
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
        //#endregion
    }


    angular.module("post")
        .controller("post.PostController", PostController);
} 