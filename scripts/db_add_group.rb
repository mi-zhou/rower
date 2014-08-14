#Run with one argument: The name of your new experiment group

require "#{File.expand_path(File.dirname(__FILE__))}/db_schema.rb"
require 'json'

DataMapper::Logger.new(STDERR, :debug)

#Connect to postgresql db
db_info = JSON.parse(File.read("./db_info.json"))
puts "connecting to db...\n"
DataMapper.setup(:default, "postgres://#{db_info["username"]}:#{db_info["password"]}@#{db_info["host"]}/#{db_info["db"]}")
puts "db connected\n"

Experimentgroup.create(:name => ARGV[0])