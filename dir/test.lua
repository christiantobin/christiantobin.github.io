function factorial(n)
	if n == 0 then
		return 1
	else
		return n * factorial(n - 1)
	end
end

io.write("Enter a number: ")
local input = io.read("*n")
local result = factorial(input)

print("The factorial of " .. input .. " is " .. result)
