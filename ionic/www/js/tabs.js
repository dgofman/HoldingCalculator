'use strict';

angular.module('holding.tabs', ['holding.calculator', 'holding.mapAgent'])

.controller('CalculatorCtrl', function($scope, $filter, Calculator) {
	Calculator.init($scope);

	$scope.$watchGroup([
		function(){ return $scope.model.IAS; },
		function(){ return $scope.model.altstg; },
		function(){ return $scope.model.temp; },
		function(){ return $scope.model.WS; },
		function(){ return $scope.model.WD; },
		function(){ return $scope.model.course; }
	], function() {
		Calculator.compute($scope.model, $filter);
	});

	$scope.$watchGroup([
		function(){ return $scope.model.IA; }
	], function() {
		Calculator.calcAlt($scope.model);
	});
})

.controller('PatternCtrl', function($scope, MapAgent) {
	MapAgent.createMap();
	//createLayer('ENR_L02_2016-09-15_ca8.mbtiles');
	//createLayer('ENR_L03_2016-09-15_c71.mbtiles');
	MapAgent.createLayer('mbtiles/EnrouteLowUS/L3/ENR_L02.mbtiles');
})

.config(function($stateProvider, $urlRouterProvider) {

	// Ionic uses AngularUI Router which uses the concept of states
	// Learn more here: https://github.com/angular-ui/ui-router
	// Set up the various states which the app can be in.
	// Each state's controller can be found in controllers.js
	$stateProvider

	// setup an abstract state for the tabs directive
	.state('tab', {
		url: '/tab',
		abstract: true,
		templateUrl: 'templates/tabs.html'
	})

	// Each tab has its own nav history stack:
	.state('tab.tab1', {
		url: '/calculator',
		views: {
			'calculator': {
				templateUrl: 'templates/tabs/calculator.html',
				controller: 'CalculatorCtrl'
			}
		}
	})

	.state('tab.tab2', {
		url: '/pattern',
		views: {
			'pattern': {
				templateUrl: 'templates/tabs/pattern.html',
				controller: 'PatternCtrl'
			}
		}
	});

	// if none of the above states are matched, use this as the fallback
	$urlRouterProvider.otherwise('/tab/calculator');
})

.filter('numberFixedLen', function () {
	return function(val) {
		if (val === 0) {
			return val;
		} else if (val < 10) {
			return '00' + val;
		} else if (val < 100) {
			return '0' + val;
		} else {
			return val;
		}
	};
});