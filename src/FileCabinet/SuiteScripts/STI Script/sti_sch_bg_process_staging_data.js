/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/task', 'SuiteScripts/STI Script/sti_modul', 'SuiteScripts/STI Script/sti_modul_sch'],
    function(search, record, email, runtime, task, sti_modul, sti_modul_sch) {
		
		var myScript = runtime.getCurrentScript();
		
		var parameter = runtime.getCurrentScript().getParameter({
            name: 'custscript_sti_param_bg_process'
        });
		
        function execute(context) {
			
			var data = JSON.parse(parameter);
			
			if (data.length > 0){
				
				for (var i = 0; i < data.length; i++){
					
					var id_bg_process = sti_modul.createBGProcess((data[i]));
					
					var parameter_sd = new Array();
					
					parameter_sd.push({
						'id_staging' : data[i],
						'id_bg_process' : id_bg_process
					});
					
					log.debug('parameter_sd', parameter_sd);
					
					sti_modul_sch.submitTaskScheduleSingleQueue(parameter_sd);
				}
				
			}
			
        }
        return {
            execute: execute
        };
    }
);