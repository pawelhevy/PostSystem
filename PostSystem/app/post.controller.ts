/// <reference path="toastr.module.ts" />
/// <reference path="../scripts/typings/jquery/jquery.d.ts" />
/// <reference path="../scripts/typings/toastr/toastr.d.ts" />
/// <reference path="../scripts/typings/angularjs/angular.d.ts" />
module post
{
    export interface  IPostController {
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

    class PostController implements  IPostController {
        states = new Array<PostModel>();
        options = {
            isFirstOpen: true,
            isSecondOpen: false,
            showValidationErrors: true,
            stateSplitter : "*"
        }
        system = {
            state: SystemState.Stop,
            steps: new Array<PostModel>(),
        };
        templates = {
            "Maszyna akceptująca słowa kończące się na a dla słowa ab":'[{"to":"B0*a*b*B1","from":"B0","isStarting":true},{"from":"*B1*a","to":"B1*"},{"from":"*B1*b","to":"B2*"},{"from":"*B1*#","to":"B1*"},{"from":"*B1*e","isEnd":true,"to":"B3"},{"from":"*B2","to":"b*B1*"},{"from":"*a","to":"a*"},{"from":"*b","to":"b*"},{"from":"*#","to":"#*"}]' 
        }

        public static $inject = ['ngToastr'];
        constructor(private toastr: ngToastr.IToastrService ) {
            
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

        removeState = (state : PostModel) => {
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
            this.system.steps.splice(0, this.system.steps.length);
        }

        systemPause = () => {
            this.system.state = SystemState.Pause;
        }

        systemPlay = () => {
            this.system.state = SystemState.Start;

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
            }
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

        getStepFromColspan = (state: PostModel) => {
            return state.from.split(this.options.stateSplitter).length;
        }
        getStepToColspan = (state: PostModel) => {
            return state.to.split(this.options.stateSplitter).length;
        }


        stopEvent = ($event) => {
            $event.preventDefault();
            $event.stopPropagation();
        }
    }


    angular.module("post")
        .controller("post.PostController", PostController);
} 