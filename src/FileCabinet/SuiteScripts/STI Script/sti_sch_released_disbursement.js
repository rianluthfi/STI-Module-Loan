/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime'],
    function(search, record, email, runtime) {
		
		var myScript = runtime.getCurrentScript();
		
		var parameter = runtime.getCurrentScript().getParameter({
            name: 'custscript_sti_id_disbursement'
        });
		
        function execute(context) {
            
			log.debug('parameter '+typeof parameter, parameter);
			
			var data = JSON.parse(parameter);
			
			log.debug('data.length '+typeof data.length, data.length);
			
			if (data.length > 0){
				
				for (var i = 0; i < data.length; i++){
					
					var stagingdata = record.load({
						type: 'customrecord_sti_staging_data',
						id: data[i],
						isDynamic: true,
					});
					
					stagingdata.setValue('custrecord_sti_status_disbursement', 2);
					
					stagingdata.save();
					
				}
				
			}
			
			/*
				{
				   list_disbursement: [
					  {
						 id: 25129
					  },
					  {
						 id: 25130
					  },
					  {
						 id: 25131
					  }
				   ]
				}
			*/

			// var obj = JSON.parse(arr_id_disbursement);
			
			// log.debug('obj.list_disbursement.length', obj.list_disbursement.length);
			
			// for (var i = 0; i < obj.list_disbursement.length; i++){
				
				// log.debug('obj.list_disbursement[i].id', obj.list_disbursement[i].id);
				
				// var data = record.load({
					// type: 'customrecord_sti_staging_data',
					// id: obj.list_disbursement[i].id,
					// isDynamic: true,
				// });
				
				// data.setValue('custrecord_sti_status_disbursement', 2);
				
				// data.save();


			// }
			// var firstEmp = obj.list_disbursement[1].id;
				
        }
        return {
            execute: execute
        };
    }
);