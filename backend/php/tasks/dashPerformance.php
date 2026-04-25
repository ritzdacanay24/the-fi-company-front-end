<?php


	class DASHPERFORMANCE
	{
	 
		protected $db;
		
		public function __construct($db)
		{
		
			$this->db = $db;
			$this->nowDate = date(" Y-m-d H:i:s", time());
			
		}			

		/**
		 * Read Order Info
		 *
		 * @param dateFrom
		 */
		public function Read()
		{
			
			/*function memoryUsage(){
				$free = shell_exec('free');
				$free = (string)trim($free);
				$free_arr = explode("\n", $free);
				$mem = explode(" ", $free_arr[1]);
				$mem = array_filter($mem);
				$mem = array_merge($mem);
				$memory_usage = $mem[2]/$mem[1]*100;
				return $memory_usage;
			}
			$memoryUsage =  memoryUsage();
			
			function memoryAllocated() {
				$memory = memory_get_usage(true);
				return $memory;
			}*/
			function cpuUsage(){
				$load = sys_getloadavg();
				return $load[0];
			}
			$cpuUsage = cpuUsage();
			
			$memoryAllocated  = memory_get_usage(true);
			$memoryUse  = memory_get_usage(false);
			
			$memoryUsage = ($memoryUse/ $memoryAllocated) * 100;
			
			function convert($size){
				$unit = array('b','kb','mb','gb','tb','pb');
				return @round($size/pow(1024,($i=floor(log($size,1024)))),2).' '.$unit[$i];
			}
			$memoryUsageConvert = convert(memory_get_usage(false)); 
			
			
			function processes() {
				$proc_count = 0;
				$dh = opendir('/proc');
				while ($dir = readdir($dh)) {
					if (is_dir('/proc/' . $dir)) {
						if (preg_match('/^[0-9]+$/', $dir)) {
							$proc_count ++;
						}
					}
				}
				return $proc_count;
			}	
			$processes = processes();
			
			/* function diskUsage() {
				$disktotal = disk_total_space ('/');
				$diskfree  = disk_free_space  ('/');
				$diskuse   = round (100 - (($diskfree / $disktotal) * 100));
				return $diskuse;
			}
			$diskUsage = diskUsage(); */
			
			$qry = "
				INSERT INTO db.dashPerformance(
					memoryUsage
					, memoryUsageConvert
					, processes
					, dateTime
					, cpuUsage
				) 
				VALUES (
					:memoryUsage
					, :memoryUsageConvert
					, :processes
					, :dateTime
					, :cpuUsage
				)
			";
			$stmt = $this->db->prepare($qry);
			$stmt->bindParam(":memoryUsage", $memoryUsage);
			$stmt->bindParam(":memoryUsageConvert", $memoryUsageConvert);
			$stmt->bindParam(":processes", $processes);
			$stmt->bindParam(":dateTime", $this->nowDate);
			$stmt->bindParam(":cpuUsage", $cpuUsage);
			$stmt->execute();
		}
			
		/**
		 * Automatically closes the mysql connection
		 * at the end of the program.
		 */
		public function __destruct() {
			$this->db = null;
		}
	}

	use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();
	
	$data = new DASHPERFORMANCE($db);
	$data->Read();
		




