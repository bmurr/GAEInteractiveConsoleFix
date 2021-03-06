angular.module('historyPanel')
    .controller('HistoryPanelCtrl', function ($scope, $timeout, flexGridConfigFactory, humanizedTimeSpan) {

        $scope.prettyTime = function (date) {
            return date.getFullYear() + "-"
                + ("0" + (date.getMonth() + 1)).slice(-2) + "-"
                + ("0" + date.getDate()).slice(-2) + " "
                + ("0" + date.getHours()).slice(-2) + ":"
                + ("0" + date.getMinutes()).slice(-2) + ":"
                + ("0" + date.getSeconds()).slice(-2) + "."
                + ("00" + date.getMilliseconds()).slice(-3);
        };

        $scope.prettyBytes = function (bytes) {
            if (bytes >= 1000000000) {
                bytes = (bytes / 1000000000).toFixed(2) + ' GB';
            }
            else if (bytes >= 1000000) {
                bytes = (bytes / 1000000).toFixed(2) + ' MB';
            }
            else if (bytes >= 1000) {
                bytes = (bytes / 1000).toFixed(2) + ' KB';
            }
            else if (bytes > 1) {
                bytes = bytes + ' bytes';
            }
            else if (bytes == 1) {
                bytes = bytes + ' byte';
            }
            else {
                bytes = '0 bytes';
            }
            return bytes;
        };

        $scope.renderTemplate = function () {
            var usagePromise = new Promise(function (resolve, reject) {
                chrome.storage.local.getBytesInUse(null, function (bytesInUse) {
                    resolve(bytesInUse);
                });
            });

            var dataPromise = new Promise(function (resolve, reject) {
                chrome.storage.local.get(null, function (historyObject) {
                    resolve(historyObject);
                });
            });

            Promise.all([usagePromise, dataPromise]).then(function (values) {

                var logCount = 0;
                var history = [];
                angular.forEach(values[1].history, function (value, key) {
                    value.humanizedTimestamp = humanizedTimeSpan.humanized_time_span(value.timestamp);
                    value.titles = {};
                    value.titles.humanizedTimestamp = $scope.prettyTime(new Date(value.timestamp));

                    value.location = value.url.indexOf('localhost') !== -1 ? 'localhost' : 'appengine';
                    value.contentLength = value.content.length;
                    history.push(value);
                    logCount += 1;
                });
                history.reverse();

                $scope.summary = {
                    bytesInUse: $scope.prettyBytes(values[0]),
                    logCount: logCount
                };

                $scope.historyConfig.setData(history);
                $scope.$apply();
            });

        };

        function selectedCallback(event, rowIndex, columnIndex){
            $scope.historyConfig.selectedHistoryItem = $scope.historyConfig.data[rowIndex];
            var flexGridRoot = angular.element('.flex-grid-root');
            var columnOneWidth = angular.element(flexGridRoot.find('.header-container col')[0]).css('width');
            $scope.columnOneStyle = $scope.historyConfig.selectedHistoryItem ? '0 0 ' + columnOneWidth : '1 1 auto';
            flexGridRoot.focus();
        }

        function bindKeyListeners(){
            angular.element(document).bind('keydown', function (e) {
                var pressed = [];
                if(e.shiftKey){
                    pressed.push("Shift");
                }
                if(e.ctrlKey){
                    pressed.push("Ctrl");
                }
                if(e.metaKey){
                    pressed.push("Meta");
                } 
                pressed.push(e.keyCode);
                console.log(pressed.join(' + '));

                //Hijack Cmd + F and Ctrl + F
                if ((e.metaKey || e.ctrlKey) && e.keyCode == 70){
                    toggleSearchBar(true);
                    e.preventDefault();
                    e.stopPropagation();    
                }
                
            });
        }

        function toggleSearchBar(show){
            show = show === undefined ? !showSearchBar : show;
            if (!show){
                // $scope.historyConfig.resetFilter();
            }

            $timeout(function(){
                $scope.showSearchBar = show;
                angular.element('.search-bar input').focus();
            });
        }

        function search(text){
            function searchFn(historyObject){
                return historyObject.content.indexOf(text) !== -1;
            }
            $timeout(function(){
                // $scope.historyConfig.filterData(searchFn);    
            });            
        };



        $scope.showSearchBar = false;
        $scope.search = search;
        $scope.toggleSearchBar = toggleSearchBar;
        $scope.history = [];
        $scope.historyConfig = new flexGridConfigFactory.FlexGridConfig();
        $scope.historyConfig.setHeaderMap({humanizedTimestamp: 'Timestamp', url: 'URL', location: 'Location', contentLength: 'Size', content: 'Content'});
        $scope.historyConfig.setColumnWidthPercentages([20, 25, 10, 5, 40]);
        $scope.historyConfig.setSelectedCallback(selectedCallback);
        $scope.historyConfig.numColumns = [0, 1, 2, 3, 4];

        $scope.renderTemplate();
        bindKeyListeners();


    });